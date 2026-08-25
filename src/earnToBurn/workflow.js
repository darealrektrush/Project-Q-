import { PublicKey } from '@solana/web3.js';
import { createHash } from 'node:crypto';

import { burnVerificationEnabled, earnToBurnEnabled } from '../lib/featureFlags.js';
import { buildBurnPublishingPackage } from './content.js';
import { fetchAndVerifyBurnTransaction } from './solanaProof.js';

function requireEarnToBurn(env) {
  if (!earnToBurnEnabled(env)) throw new Error('Earn to Burn is disabled');
}

function requireVerification(env) {
  requireEarnToBurn(env);
  if (!burnVerificationEnabled(env)) throw new Error('burn verification is disabled');
}

function firstRpcRow(result) {
  return Array.isArray(result) ? result[0] ?? null : result;
}

function positiveIntegerString(value, label) {
  const normalized = String(value);
  if (!/^[1-9]\d*$/.test(normalized)) throw new Error(`${label} must be a positive integer`);
  return normalized;
}

function contentHash(body) {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

export async function syncXpProgress(client, programId, { limit = 1000, env = process.env } = {}) {
  requireEarnToBurn(env);
  if (!programId) throw new Error('Earn to Burn program id is required');
  if (!Number.isInteger(limit) || limit < 1 || limit > 5000) {
    throw new Error('progress sync limit must be between 1 and 5000');
  }
  return firstRpcRow(await client.rpc('sync_earn_to_burn_xp_progress', {
    p_program_id: programId,
    p_limit: limit,
  }));
}

export async function createBurnProposal(client, {
  programId, milestoneId, sourceTokenAccount, env = process.env,
}) {
  requireEarnToBurn(env);
  if (!programId || !milestoneId || !sourceTokenAccount) throw new Error('complete burn proposal input is required');
  return firstRpcRow(await client.rpc('create_burn_proposal', {
    p_program_id: programId,
    p_milestone_id: milestoneId,
    p_source_token_account: sourceTokenAccount,
  }));
}

export async function recordFounderDecision(client, {
  proposalId, founderUserId, decision, readinessHash, env = process.env,
}) {
  requireEarnToBurn(env);
  const normalizedProposalId = positiveIntegerString(proposalId, 'proposal id');
  const normalizedFounderUserId = positiveIntegerString(founderUserId, 'founder id');
  if (!['APPROVE', 'HOLD', 'CANCEL'].includes(decision)) throw new Error('invalid founder decision');
  if (!/^[0-9a-f]{64}$/.test(String(readinessHash))) throw new Error('invalid readiness hash');
  return firstRpcRow(await client.rpc('record_burn_proposal_decision', {
    p_proposal_id: normalizedProposalId,
    p_founder_user_id: normalizedFounderUserId,
    p_decision: decision,
    p_readiness_hash: readinessHash,
  }));
}

export async function attachExternalBurnSignature(client, {
  proposalId, signature, env = process.env,
}) {
  requireVerification(env);
  const normalizedProposalId = positiveIntegerString(proposalId, 'proposal id');
  return firstRpcRow(await client.rpc('attach_approved_burn_signature', {
    p_proposal_id: normalizedProposalId,
    p_transaction_signature: signature,
  }));
}

export async function getBurnWorkflowState(client, programId) {
  const [programRows, sourceAccounts, founders, milestones, proposals, receipts] = await Promise.all([
    client.select('earn_to_burn_programs', `?id=eq.${encodeURIComponent(programId)}&select=id,campaign_id,state,mint,token_program_id,decimals,original_supply_base_units,observed_start_supply_base_units,rules_hash&limit=1`),
    client.select('burn_source_accounts', `?program_id=eq.${encodeURIComponent(programId)}&select=token_account,authority_label,source_type,approved,evidence_url,verified_at`),
    client.select('burn_program_founders', `?program_id=eq.${encodeURIComponent(programId)}&select=founder_user_id,founder_label&order=founder_user_id.asc`),
    client.select('burn_milestones', `?program_id=eq.${encodeURIComponent(programId)}&select=id,sequence,label,progress_target_units,burn_amount_base_units,burn_type,state,rules_hash,unlocked_at,confirmed_at&order=sequence.asc`),
    client.select('burn_proposals', `?program_id=eq.${encodeURIComponent(programId)}&select=id,milestone_id,burn_type,source_token_account,amount_base_units,rules_hash,state,transaction_signature,created_at,updated_at&order=created_at.desc`),
    client.select('burn_receipts', `?program_id=eq.${encodeURIComponent(programId)}&select=id,receipt_code,proposal_id,amount_base_units,transaction_signature,confirmed_at&order=confirmed_at.desc`),
  ]);
  const program = programRows[0] ?? null;
  if (!program) return { program: null, sourceAccounts: [], founders: [], milestones: [], proposals: [], receipts: [] };
  const proposalIds = proposals.map(({ id }) => positiveIntegerString(id, 'proposal id'));
  const receiptIds = receipts.map(({ id }) => positiveIntegerString(id, 'receipt id'));
  const [approvals, publicationDrafts] = await Promise.all([
    proposalIds.length ? client.select(
      'burn_proposal_approvals',
      `?proposal_id=in.(${proposalIds.join(',')})&select=proposal_id,founder_user_id,decision,readiness_hash,updated_at`
    ) : [],
    receiptIds.length ? client.select(
      'burn_publication_drafts',
      `?receipt_id=in.(${receiptIds.join(',')})&select=id,receipt_id,platform,body,body_hash,state,approved_by,approved_at,published_ref,published_at`
    ) : [],
  ]);
  return {
    program,
    sourceAccounts,
    founders,
    milestones,
    proposals: proposals.map((proposal) => ({
      ...proposal,
      approvals: approvals.filter(({ proposal_id }) => String(proposal_id) === String(proposal.id)),
    })),
    receipts: receipts.map((receipt) => ({
      ...receipt,
      publicationDrafts: publicationDrafts.filter(({ receipt_id }) => String(receipt_id) === String(receipt.id)),
    })),
  };
}

export async function loadBurnVerificationContext(client, proposalId) {
  const proposalRows = await client.select(
    'burn_proposals',
    `?id=eq.${encodeURIComponent(String(proposalId))}&select=id,program_id,state,mint,token_program_id,source_token_account,amount_base_units,transaction_signature&limit=1`
  );
  const proposal = proposalRows[0];
  if (!proposal || proposal.state !== 'AWAITING_CONFIRMATION' || !proposal.transaction_signature) {
    throw new Error('burn proposal is not awaiting confirmation');
  }
  const [programRows, receiptRows] = await Promise.all([
    client.select('earn_to_burn_programs', `?id=eq.${encodeURIComponent(proposal.program_id)}&select=id,campaign_id,decimals,original_supply_base_units,observed_start_supply_base_units&limit=1`),
    client.select('burn_receipts', `?program_id=eq.${encodeURIComponent(proposal.program_id)}&select=supply_after_base_units,confirmed_at&order=confirmed_at.desc&limit=1`),
  ]);
  const program = programRows[0];
  if (!program) throw new Error('Earn to Burn program not found');
  return {
    proposal,
    program,
    expectedSupplyBeforeBaseUnits: String(
      receiptRows[0]?.supply_after_base_units ?? program.observed_start_supply_base_units
    ),
  };
}

export async function verifyAndConfirmBurn(client, connection, proposalId, {
  env = process.env,
} = {}) {
  requireVerification(env);
  const context = await loadBurnVerificationContext(client, proposalId);
  if (!/^\d+$/.test(context.expectedSupplyBeforeBaseUnits)) {
    throw new Error('expected pre-burn supply is not configured');
  }
  const proof = await fetchAndVerifyBurnTransaction(
    connection,
    context.proposal.transaction_signature,
    {
      mint: context.proposal.mint,
      mintPublicKey: new PublicKey(context.proposal.mint),
      tokenProgramId: context.proposal.token_program_id,
      sourceTokenAccount: context.proposal.source_token_account,
      amountBaseUnits: context.proposal.amount_base_units,
      supplyBeforeBaseUnits: context.expectedSupplyBeforeBaseUnits,
    }
  );
  const receipt = firstRpcRow(await client.rpc('confirm_verified_burn', {
    p_proposal_id: positiveIntegerString(proposalId, 'proposal id'),
    p_amount_base_units: proof.amountBaseUnits,
    p_supply_before_base_units: proof.supplyBeforeBaseUnits,
    p_supply_after_base_units: proof.supplyAfterBaseUnits,
    p_slot: Number(proof.slot),
    p_block_time: proof.blockTime,
    p_proof: proof,
  }));
  return { receipt, proof };
}

export async function preparePublicationDrafts(client, receipt, {
  publicBaseUrl, originalSupplyBaseUnits, decimals = 6,
}) {
  const drafts = buildBurnPublishingPackage({
    receiptCode: receipt.receipt_code,
    burnType: receipt.burn_type,
    amountBaseUnits: receipt.amount_base_units,
    supplyAfterBaseUnits: receipt.supply_after_base_units,
    signature: receipt.transaction_signature,
  }, { publicBaseUrl, originalSupplyBaseUnits, decimals });
  const bodies = {
    PROJECT_Q: JSON.stringify(drafts.projectQ),
    X: drafts.x,
    TELEGRAM: drafts.telegram,
    DISCORD: drafts.discord,
  };
  const existing = await client.select(
    'burn_publication_drafts',
    `?receipt_id=eq.${encodeURIComponent(String(receipt.id))}&select=platform,state`
  );
  const existingPlatforms = new Set(existing.map(({ platform }) => platform));
  const missing = Object.entries(bodies).filter(([platform]) => !existingPlatforms.has(platform));
  if (!missing.length) return existing;
  return client.insert('burn_publication_drafts', missing.map(([platform, body]) => ({
    receipt_id: receipt.id,
    platform,
    body,
    body_hash: contentHash(body),
    state: 'DRAFT',
  })));
}

export async function approvePublicationDraft(client, {
  draftId, founderUserId, expectedBodyHash, env = process.env,
}) {
  requireEarnToBurn(env);
  if (!/^[0-9a-f]{64}$/.test(String(expectedBodyHash))) throw new Error('invalid publication body hash');
  return firstRpcRow(await client.rpc('approve_burn_publication_draft', {
    p_draft_id: positiveIntegerString(draftId, 'draft id'),
    p_approver_user_id: positiveIntegerString(founderUserId, 'founder id'),
    p_expected_body_hash: expectedBodyHash,
  }));
}

export async function markPublicationPublished(client, {
  draftId, expectedBodyHash, publishedRef, env = process.env,
}) {
  requireEarnToBurn(env);
  if (!/^[0-9a-f]{64}$/.test(String(expectedBodyHash))) throw new Error('invalid publication body hash');
  if (!String(publishedRef ?? '').trim()) throw new Error('published reference is required');
  return firstRpcRow(await client.rpc('mark_burn_publication_published', {
    p_draft_id: positiveIntegerString(draftId, 'draft id'),
    p_expected_body_hash: expectedBodyHash,
    p_published_ref: String(publishedRef).trim(),
  }));
}
