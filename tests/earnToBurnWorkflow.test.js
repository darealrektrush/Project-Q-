import test from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';

import { buildBurnWorkflowAdminText } from '../src/earnToBurn/adminUi.js';
import { TOKEN_2022_PROGRAM_ID } from '../src/earnToBurn/solanaProof.js';
import {
  approvePublicationDraft,
  attachExternalBurnSignature,
  createBurnProposal,
  getBurnWorkflowState,
  preparePublicationDrafts,
  recordFounderDecision,
  syncXpProgress,
  verifyAndConfirmBurn,
  markPublicationPublished,
} from '../src/earnToBurn/workflow.js';

const enabled = {
  PROJECT_Q_EARN_TO_BURN_ENABLED: 'true',
  PROJECT_Q_BURN_VERIFICATION_ENABLED: 'true',
};
const rulesHash = 'a'.repeat(64);

test('progress sync is flag-gated, bounded and delegated to one atomic RPC', async () => {
  const calls=[];
  const client={rpc:async(fn,args)=>{calls.push([fn,args]);return [{inserted_events:2,total_progress_units:8,unlocked_milestones:1}];}};
  await assert.rejects(() => syncXpProgress(client,'p1',{env:{}}), /disabled/);
  await assert.rejects(() => syncXpProgress(client,'p1',{env:enabled,limit:5001}), /limit/);
  const result=await syncXpProgress(client,'p1',{env:enabled,limit:200});
  assert.deepEqual(result,{inserted_events:2,total_progress_units:8,unlocked_milestones:1});
  assert.deepEqual(calls[0],['sync_earn_to_burn_xp_progress',{p_program_id:'p1',p_limit:200}]);
});

test('proposal creation and founder decisions preserve database authorization boundaries', async () => {
  const calls=[];
  const client={rpc:async(fn,args)=>{calls.push([fn,args]);return [{id:7,state:'PENDING_APPROVAL'}];}};
  await createBurnProposal(client,{programId:'p1',milestoneId:'m1',sourceTokenAccount:'reserve',env:enabled});
  await recordFounderDecision(client,{proposalId:7,founderUserId:123,decision:'APPROVE',readinessHash:rulesHash,env:enabled});
  assert.equal(calls[0][0],'create_burn_proposal');
  assert.equal(calls[1][0],'record_burn_proposal_decision');
  assert.equal(calls[1][1].p_founder_user_id,'123');
  await assert.rejects(() => recordFounderDecision(client,{proposalId:7,founderUserId:123,decision:'BURN',readinessHash:rulesHash,env:enabled}), /decision/);
  await assert.rejects(() => recordFounderDecision(client,{proposalId:7,founderUserId:123,decision:'APPROVE',readinessHash:'stale',env:enabled}), /hash/);
});

test('external signature attachment requires both activation flags', async () => {
  const calls=[];
  const client={rpc:async(fn,args)=>{calls.push([fn,args]);return [{id:7,state:'AWAITING_CONFIRMATION'}];}};
  await assert.rejects(() => attachExternalBurnSignature(client,{proposalId:7,signature:'sig',env:{PROJECT_Q_EARN_TO_BURN_ENABLED:'true'}}), /verification is disabled/);
  await attachExternalBurnSignature(client,{proposalId:7,signature:'sig',env:enabled});
  assert.equal(calls[0][0],'attach_approved_burn_signature');
});

test('read-only workflow state groups founder approvals without exposing mutation controls', async () => {
  const rows={
    earn_to_burn_programs:[{id:'p1',state:'ENABLED',decimals:6}],
    burn_source_accounts:[{token_account:'reserve',approved:true,evidence_url:'https://proof',verified_at:'2026-08-25T00:00:00Z'}],
    burn_program_founders:[{founder_user_id:123,founder_label:'Founder 1'}],
    burn_milestones:[{id:'m1',state:'APPROVAL_PENDING'}],
    burn_proposals:[{id:7,state:'PENDING_APPROVAL',amount_base_units:'15000000000000',transaction_signature:null}],
    burn_proposal_approvals:[{proposal_id:7,founder_user_id:123,decision:'APPROVE'}],
    burn_receipts:[],
  };
  const state=await getBurnWorkflowState({select:async table=>rows[table]},'p1');
  assert.equal(state.founders[0].founder_user_id,123);
  assert.equal(state.proposals[0].approvals.length,1);
  const text=buildBurnWorkflowAdminText(state);
  assert.match(text,/Founder approvals:\* 1\/2/);
  assert.match(text,/no signer/i);
  assert.match(text,/read-only panel/i);
});

test('finalized Token-2022 proof is reconciled before receipt confirmation', async () => {
  const mint='GKnhgBgyYs8zPvteBoMXjt1Ew962tQYVU8gQztFdpump';
  const source='9xQeWvG816bUx9EPfHMf6mU5sF6x1hX5q4k7W1m2K3p';
  const signature=bs58.encode(new Uint8Array(64).fill(2));
  const rpcCalls=[];
  const client={
    select:async table=>({
      burn_proposals:[{id:7,program_id:'p1',state:'AWAITING_CONFIRMATION',mint,token_program_id:TOKEN_2022_PROGRAM_ID,source_token_account:source,amount_base_units:'15000000000000',transaction_signature:signature}],
      earn_to_burn_programs:[{id:'p1',campaign_id:'bond',decimals:6,original_supply_base_units:'1000000000000000',observed_start_supply_base_units:'999999999658335'}],
      burn_receipts:[],
    })[table],
    rpc:async(fn,args)=>{rpcCalls.push([fn,args]);return [{id:1,receipt_code:'ETB-0001'}];},
  };
  const connection={
    getSignatureStatuses:async()=>({value:[{confirmationStatus:'finalized',err:null}]}),
    getParsedTransaction:async()=>({
      slot:123,blockTime:1_700_000_000,
      transaction:{message:{accountKeys:[source],instructions:[{programId:TOKEN_2022_PROGRAM_ID,parsed:{type:'burnChecked',info:{account:source,mint,tokenAmount:{amount:'15000000000000'}}}}]}},
      meta:{err:null,preTokenBalances:[{accountIndex:0,uiTokenAmount:{amount:'20000000000000'}}],postTokenBalances:[{accountIndex:0,uiTokenAmount:{amount:'5000000000000'}}]},
    }),
    getTokenSupply:async()=>({value:{amount:'984999999658335'}}),
  };
  const result=await verifyAndConfirmBurn(client,connection,7,{env:enabled});
  assert.equal(result.receipt.receipt_code,'ETB-0001');
  assert.equal(rpcCalls[0][0],'confirm_verified_burn');
  assert.equal(rpcCalls[0][1].p_proof.signature,signature);
  assert.equal(rpcCalls[0][1].p_supply_after_base_units,'984999999658335');
});

test('publication draft preparation inserts only missing platforms and never resets approvals', async () => {
  const inserted=[];
  const client={
    select:async()=>[{platform:'X',state:'APPROVED'}],
    insert:async(table,rows)=>{inserted.push([table,rows]);return rows;},
  };
  await preparePublicationDrafts(client,{
    id:1,receipt_code:'ETB-0001',burn_type:'RESERVE_BURN',amount_base_units:'15000000000000',
    supply_after_base_units:'984999999658335',transaction_signature:'proof',
  },{publicBaseUrl:'https://project-q.example',originalSupplyBaseUnits:'1000000000000000'});
  assert.equal(inserted[0][0],'burn_publication_drafts');
  assert.deepEqual(inserted[0][1].map(({platform})=>platform).sort(),['DISCORD','PROJECT_Q','TELEGRAM']);
  assert.ok(inserted[0][1].every(({body_hash})=>/^[0-9a-f]{64}$/.test(body_hash)));
});

test('publication approval and completion use the exact reviewed content hash', async () => {
  const calls=[];
  const client={rpc:async(fn,args)=>{calls.push([fn,args]);return [{id:9,state:fn.startsWith('approve')?'APPROVED':'PUBLISHED'}];}};
  const hash='b'.repeat(64);
  await approvePublicationDraft(client,{draftId:9,founderUserId:123,expectedBodyHash:hash,env:enabled});
  await markPublicationPublished(client,{draftId:9,expectedBodyHash:hash,publishedRef:'https://x.com/fawkq/status/1',env:enabled});
  assert.equal(calls[0][0],'approve_burn_publication_draft');
  assert.equal(calls[0][1].p_expected_body_hash,hash);
  assert.equal(calls[1][0],'mark_burn_publication_published');
  assert.equal(calls[1][1].p_published_ref,'https://x.com/fawkq/status/1');
  await assert.rejects(()=>approvePublicationDraft(client,{draftId:9,founderUserId:123,expectedBodyHash:'stale',env:enabled}),/hash/);
});
