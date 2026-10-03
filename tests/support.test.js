import test from 'node:test';
import assert from 'node:assert/strict';
import {supportInput,readSupport,writeSupport,supportEnabled,supportTeamCommand} from '../src/campaign/support.js';
const id='11111111-1111-4111-8111-111111111111';
test('support rejects invalid inputs and is Dev-only',()=>{
 assert.equal(supportEnabled({RENDER_SERVICE_NAME:'project-q'}),false);
 assert.equal(supportEnabled({RENDER_SERVICE_NAME:'project-q-dev'}),true);
 for (const patch of [{messageId:'x'},{category:'admin'},{body:' '},{subject:'x'},{body:'a'.repeat(3001)}]) assert.throws(()=>supportInput({messageId:id,category:'xp',subject:'Missing XP',body:'What happened?',...patch}));
});
test('support ownership is checked before any message body is read',async()=>{
 const calls=[];const client={select:async(table,query)=>{calls.push({table,query});return [];}};
 await assert.rejects(readSupport(client,'profile-a',id),/not found/);
 assert.equal(calls.length,1);assert.match(calls[0].query,/profile_id=eq.profile-a/);
});
test('participant cannot inject the team role or another profile into support writes',async()=>{
 let args;const client={rpc:async(fn,value)=>{args=value;return id;}};
 await writeSupport(client,'profile-a','operation-a',{messageId:id,category:'xp',subject:'Missing XP',body:'Please check',profileId:'profile-b',team:true});
 assert.equal(args.p_profile,'profile-a');assert.equal(args.p_team,false);
});
test('team queue avoids printing private request bodies',async()=>{
 const response=await supportTeamCommand({select:async()=>[{id,category:'xp',status:'waiting_team',subject:'private subject',body:'private content'}]},'/qsupport');
 assert.doesNotMatch(response,/private/);assert.match(response,/waiting_team/);
});
