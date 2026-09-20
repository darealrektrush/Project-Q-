import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sqlPath = new URL('../supabase/migrations/20260920180000_lock_bond_buytoearn_conservation_economics.sql', import.meta.url);

test('economics lock makes Buy-to-Earn weight-only inside the existing 15M pool', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /buyToEarn,mode}' is distinct from 'WEIGHT_ONLY'/);
  assert.match(sql, /buyToEarn,separateTokenPool}' is distinct from 'false'/);
  assert.match(sql, /buyToEarn,poolBaseUnits}' is distinct from '0'/);
  assert.match(sql, /SQUADS_COMMUNITY_VAULT_CAMPAIGN_REWARDS/);
  assert.match(sql, /includedInCampaignRewardsBaseUnits}' is distinct from '15000000000000'/);
  assert.match(sql, /tier1Weight}'\)::integer <> 1/);
  assert.match(sql, /tier2Weight}'\)::integer <> 3/);
  assert.doesNotMatch(sql, /SEPARATE_POOL/);
});

test('economics lock preserves creator-wallet funded 15M Earn-to-Burn', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /earnToBurnBaseUnits}' is distinct from '15000000000000'/);
  assert.match(sql, /earnToBurnSource}' is distinct from 'FAWKQ_CREATOR_WALLET'/);
});

test('economics lock requires 1 SOL winner prize plus 0.10 SOL conservation impact', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /topContributorLamports}' is distinct from '1000000000'/);
  assert.match(sql, /topContributorConservationLamports}' is distinct from '100000000'/);
  assert.match(sql, /totalSolCommitmentLamports}' is distinct from '1100000000'/);
  assert.match(sql, /OCEAN_CONSERVATION_VAULT/);
  assert.match(sql, /TOP_BOND_THE_DUCKER_PUBLIC_CAMPAIGN_IDENTITY/);
});

test('funding proposal records prize and conservation as separate project-funded commitments', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /conservation_vault_address/);
  assert.match(sql, /conservation_contribution_lamports = 100000000/);
  assert.match(sql, /total_sol_commitment_lamports = 1100000000/);
  assert.match(sql, /top_contributor_prize_lamports <> 1000000000/);
  assert.match(sql, /conservation_contribution_lamports <> 100000000/);
  assert.match(sql, /finalized Bond funding proposal with conservation impact is required/);
});

test('economics migration changes no campaign state, funding amount, winner or burn execution itself', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.doesNotMatch(sql, /update public\.campaigns\s+set\s+state/i);
  assert.doesNotMatch(sql, /insert into public\.cycle_winners/i);
  assert.doesNotMatch(sql, /insert into public\.allocations/i);
  assert.doesNotMatch(sql, /execute_burn|burn_tokens/i);
});
