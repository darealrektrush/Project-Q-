import { randomUUID } from 'node:crypto';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SUPPORT_CATEGORIES = ['identity','mission','xp','rewards','wallet','technical','ocean'];
export function supportEnabled(env=process.env) { return env.RENDER_SERVICE_NAME === 'project-q-dev'; }
export function supportId(value) { if (!UUID.test(String(value||''))) throw new Error('invalid support id'); return value; }
export function supportInput(input) {
 const body=typeof input.body==='string' ? input.body.trim() : '';
 const subject=typeof input.subject==='string' ? input.subject.trim() : '';
 if (!body || body.length>3000 || (!input.threadId && (subject.length<5 || subject.length>120 || !SUPPORT_CATEGORIES.includes(input.category)))) throw new Error('invalid support request');
 return {body,subject,category:input.category,threadId:input.threadId ? supportId(input.threadId) : null,messageId:supportId(input.messageId)};
}
export async function listSupport(client,profileId) {
 return client.select('q_support_threads',`?profile_id=eq.${encodeURIComponent(profileId)}&select=id,category,subject,status,created_at,updated_at&order=updated_at.desc&limit=30`);
}
export async function readSupport(client,profileId,id) {
 supportId(id);
 const rows=await client.select('q_support_threads',`?id=eq.${id}&profile_id=eq.${encodeURIComponent(profileId)}&select=id,category,subject,status,created_at,updated_at&limit=1`);
 if (!rows[0]) throw new Error('support thread not found');
 const messages=await client.select('q_support_messages',`?thread_id=eq.${id}&select=id,sender,body,created_at&order=created_at.asc,id.asc&limit=200`);
 return {...rows[0],messages};
}
export async function writeSupport(client,profileId,campaignId,input,{team=false}={}) {
 const value=supportInput(input);
 return client.rpc('q_support_write',{p_profile:profileId,p_campaign:campaignId,p_thread:value.threadId,p_message:value.messageId,p_category:value.category||null,p_subject:value.subject||null,p_body:value.body,p_team:team});
}
export async function supportTeamCommand(client,text) {
 if (text==='/qsupport') {
  const rows=await client.select('q_support_threads','?status=neq.resolved&select=id,category,status&order=updated_at.desc&limit=10');
  return rows.length ? rows.map(row=>`${row.id}\n${row.category} · ${row.status}`).join('\n\n') : 'No open support requests.';
 }
 const read=text.match(/^\/qsupportread\s+([\w-]+)$/);
 if (read) {
  const id=supportId(read[1]);
  const rows=await client.select('q_support_threads',`?id=eq.${id}&select=profile_id&limit=1`);
  if (!rows[0]) throw new Error('support thread not found');
  const thread=await readSupport(client,rows[0].profile_id,id);
  return `${thread.subject} · ${thread.status}\n\n${thread.messages.slice(-5).map(m=>`${m.sender}: ${m.body}`).join('\n\n')}`.slice(0,3900);
 }
 const match=text.match(/^\/qsupportreply\s+([\w-]+)\s+([\s\S]+)$/);
 if (!match) return 'Use /qsupport, /qsupportread THREAD_ID or /qsupportreply THREAD_ID reply text. Replies are saved inside the app.';
 const id=supportId(match[1]);
 const rows=await client.select('q_support_threads',`?id=eq.${id}&select=profile_id,campaign_id&limit=1`);
 if (!rows[0]) throw new Error('support thread not found');
 await writeSupport(client,rows[0].profile_id,rows[0].campaign_id,{threadId:id,messageId:randomUUID(),body:match[2]},{team:true});
 return 'Team reply saved. The participant can read it in Project Q Help Centre.';
}
