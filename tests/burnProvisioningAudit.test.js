import test from 'node:test';
import assert from 'node:assert/strict';

import { auditBondBurnProvisioning } from '../src/earnToBurn/provisioningAudit.js';
import {
  FAWKQ_CREATOR_TOKEN_ACCOUNT,
  FAWKQ_MINT,
  TOKEN_2022_PROGRAM_ID,
} from '../src/earnToBurn/identity.js';

const rulesHash='a'.repeat(64);
const campaign={id:'bond-the-duck-2026',rules_hash:rulesHash,ruleset_version:5};
const ruleset={version:5,rules_hash:rulesHash,rules_json:{status:'FINAL'}};
const program={
  id:'fawkq-earn-to-burn',campaign_id:'bond-the-duck-2026',state:'ENABLED',
  mint:FAWKQ_MINT,token_program_id:TOKEN_2022_PROGRAM_ID,decimals:6,
  rules_hash:rulesHash,hard_cap_base_units:'15000000000000',
  max_single_burn_base_units:'3000000000000'
};
const sourceAccounts=[{
  token_account:FAWKQ_CREATOR_TOKEN_ACCOUNT,source_type:'CREATOR_WALLET_RESERVE',
  approved:true,evidence_url:'https://example.com/source',verified_at:'2026-10-01T00:00:00Z'
}];
const founders=[{founder_user_id:101},{founder_user_id:202}];
const milestones=[2000,5000,9000,14000,20000].map((target,index)=>({
  id:`bond-burn-${index+1}`,sequence:index+1,progress_target_units:String(target),
  burn_amount_base_units:'3000000000000',burn_type:'RESERVE_BURN',state:'LOCKED',rules_hash:rulesHash
}));

test('exact final creator-wallet configuration passes burn provisioning audit',()=>{
  const audit=auditBondBurnProvisioning({campaign,ruleset,program,sourceAccounts,founders,milestones});
  assert.equal(audit.ready,true);
  assert.deepEqual(audit.blockers,[]);
  assert.equal(audit.hardCapBaseUnits,'15000000000000');
  assert.equal(audit.maxSingleBurnBaseUnits,'3000000000000');
  assert.match(audit.reportHash,/^[0-9a-f]{64}$/);
  assert.equal(audit.mutationsPerformed,false);
});

test('audit fails closed on source, founder, rules or milestone drift',()=>{
  const variants=[
    {sourceAccounts:[{...sourceAccounts[0],approved:false}]},
    {founders:[{founder_user_id:101}]},
    {program:{...program,rules_hash:'b'.repeat(64)}},
    {program:{...program,hard_cap_base_units:'14999999999999'}},
    {milestones:milestones.map((m,i)=>i===2?{...m,progress_target_units:'9999'}:m)},
  ];
  for(const patch of variants){
    const audit=auditBondBurnProvisioning({
      campaign,ruleset,program,sourceAccounts,founders,milestones,...patch
    });
    assert.equal(audit.ready,false);
    assert.ok(audit.blockers.length>0);
  }
});

test('audit stays blocked before final rules and live provisioning exist',()=>{
  const audit=auditBondBurnProvisioning({
    campaign:{...campaign,rules_hash:'',ruleset_version:1},
    ruleset:{version:1,rules_hash:'x',rules_json:{status:'DRAFT'}},
    program:null,sourceAccounts:[],founders:[],milestones:[]
  });
  assert.equal(audit.ready,false);
  assert.match(audit.blockers.join(' | '),/final campaign rules hash|not provisioned/);
});
