import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBondLaunchRehearsal } from '../src/campaign/launchRehearsal.js';

const readiness = {
  reportVersion:'bond-readiness-v3',
  reportHash:'a'.repeat(64),
  ready:false,
  checks:[
    {key:'rules',label:'Final rules',ready:false},
    {key:'funding',label:'Funding',ready:false},
    {key:'draw-commitments',label:'Draw commitments',ready:false},
  ],
};

test('pre-launch incomplete state can still be integrity-safe',()=>{
  const report=buildBondLaunchRehearsal({
    campaign:{id:'bond-the-duck-2026',state:'DRAFT'},
    readiness,
    funding:{fundedBaseUnits:'0',finalized:false},
    burnAudit:{ready:false,blockers:['final campaign rules hash is not selected']},
    rulesAudit:{readyForFinalProposal:false,blockers:['final campaign timestamps are not selected']},
    counts:{
      cycles:0,drawCutoffs:0,drawFinalizations:0,winners:0,allocations:0,
      impactReceipts:0,topContributorFinalizations:0,
    },
    env:{},
  });
  assert.equal(report.integritySafe,true);
  assert.equal(report.launchReady,false);
  assert.equal(report.integrityBlockers.length,0);
  assert.ok(report.pendingFinalization.length>0);
  assert.ok(report.launchBlockers.length>0);
});

test('any premature lifecycle or impact row blocks integrity rehearsal',()=>{
  for(const key of ['cycles','drawCutoffs','drawFinalizations','winners','allocations','impactReceipts','topContributorFinalizations']){
    const counts={
      cycles:0,drawCutoffs:0,drawFinalizations:0,winners:0,allocations:0,
      impactReceipts:0,topContributorFinalizations:0,
      [key]:1,
    };
    const report=buildBondLaunchRehearsal({
      campaign:{id:'bond-the-duck-2026',state:'DRAFT'},
      readiness,
      funding:{},
      burnAudit:{ready:false,blockers:[]},
      rulesAudit:{readyForFinalProposal:false,blockers:[]},
      counts,
      env:{},
    });
    assert.equal(report.integritySafe,false,key);
    assert.match(report.integrityBlockers.join(' '),new RegExp(key));
  }
});

test('enabled mutation flags block pre-launch integrity',()=>{
  const report=buildBondLaunchRehearsal({
    campaign:{id:'bond-the-duck-2026',state:'DRAFT'},
    readiness,
    funding:{},
    burnAudit:{ready:false,blockers:[]},
    rulesAudit:{readyForFinalProposal:false,blockers:[]},
    counts:{},
    env:{PROJECT_Q_DISTRIBUTIONS_ENABLED:'true'},
  });
  assert.equal(report.integritySafe,false);
  assert.match(report.integrityBlockers.join(' '),/PROJECT_Q_DISTRIBUTIONS_ENABLED/);
});

test('fully satisfied evidence can report launch ready',()=>{
  const ready={
    reportVersion:'bond-readiness-v3',
    reportHash:'b'.repeat(64),
    ready:true,
    checks:[
      {key:'rules',label:'Final rules',ready:true},
      {key:'funding',label:'Funding',ready:true},
      {key:'draw-commitments',label:'Draw commitments',ready:true},
    ],
  };
  const report=buildBondLaunchRehearsal({
    campaign:{id:'bond-the-duck-2026',state:'DRAFT'},
    readiness:ready,
    funding:{fundedBaseUnits:'17500000000000',finalized:true},
    burnAudit:{ready:true,blockers:[]},
    rulesAudit:{readyForFinalProposal:true,blockers:[]},
    counts:{},
    env:{},
  });
  assert.equal(report.integritySafe,true);
  assert.equal(report.launchReady,true);
  assert.deepEqual(report.pendingFinalization,[]);
  assert.deepEqual(report.launchBlockers,[]);
  assert.equal(report.mutationsPerformed,false);
});
