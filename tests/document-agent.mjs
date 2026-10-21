import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {createWorkerFixture,WorkerResponse} from './worker-fixture.mjs';
let requests=0,mode='success',checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++};
const fixture=await createWorkerFixture({bindings:{DEEPSEEK_API_KEY:'synthetic-key',DOCUMENT_TOOL_ENABLED:'true'},outboundService:async req=>{
 requests++;const p=await req.json();check(p.max_tokens<=2048,'output budget');
 let message={content:'普通回复'};
 if(p.tools?.length){
  let args={name:'中文采购清单',columns:['项目','金额'],rows:[['轴承',30],['配件',5],['=1+1',null]]};
  if(mode==='invalid')args.rows=[['错列']];
  if(mode==='duplicate')args.columns=['金额','金额'];
  if(mode==='oversized')args.rows=Array.from({length:501},()=>['项目',1]);
  if(mode==='widepreview'){args.columns=Array.from({length:8},(_,i)=>'列'+(i+1));args.rows=Array.from({length:6},(_,r)=>args.columns.map((_,c)=>`第${r+1}行第${c+1}列`));}
  message={content:null,tool_calls:[{id:'call_'+requests,type:'function',function:{name:mode==='unknown'?'shell':'create_spreadsheet',arguments:JSON.stringify(args)}}]};
  if(mode==='parallel')message.tool_calls.push({...message.tool_calls[0],id:'second'});
 }
 if(mode==='delete-before-proposal'){const database=await fixture.mf.getD1Database('DB');await database.prepare("DELETE FROM records WHERE owner=? AND id=? AND kind='chat'").bind('user-a','chat-race').run();}
 return new WorkerResponse(JSON.stringify({choices:[{message,finish_reason:mode==='truncated'?'length':'stop'}],usage:{prompt_tokens:10,completion_tokens:5}}),{headers:{'Content-Type':'application/json'}});
}});
async function call(path,payload,user='user-a'){
 return fixture.mf.dispatchFetch('http://fixture.test'+path,{method:payload?'POST':'GET',headers:{'Content-Type':'application/json','Origin':'http://fixture.test',...(user?{'oai-authenticated-user-id':user}:{})},body:payload?JSON.stringify(payload):undefined});
}
const remove=async(path,user='user-a')=>{const url=new URL('http://fixture.test'+path);if(url.pathname==='/api/workspace'&&!url.searchParams.has('baseUpdated')){const database=await fixture.mf.getD1Database('DB'),row=await database.prepare("SELECT updated FROM records WHERE owner=? AND id=? AND kind='chat'").bind(user,url.searchParams.get('id')).first();if(row)url.searchParams.set('baseUpdated',String(row.updated));}return fixture.mf.dispatchFetch(url,{method:'DELETE',headers:{'Origin':'http://fixture.test','oai-authenticated-user-id':user}});};
const ask=(chatId='chat-1')=>call('/api/chat',{chatId,profileId:'managed-deepseek',documentTools:true,messages:[{role:'user',content:'生成 XLSX 采购清单：轴承30，配件5'}]});
const decide=(id,action='approve',user='user-a',chatId='chat-1')=>call('/api/document-tool',{id,chatId,action},user);
const audit=(ids,user='user-a',extra={})=>call('/api/document-tool',{action:'audit',chatId:'chat-1',model:'deepseek-flash',ids,...extra},user);
try{
 const db=await fixture.mf.getD1Database('DB'),bucket=await fixture.mf.getR2Bucket('BUCKET');
 for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+name,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 check((await ask('missing-chat')).status===400&&requests===0,'document proposal requires an owned persisted chat before any model call');
 for(const id of ['chat-1','chat-2','chat-deleted','chat-executing','chat-terminal','chat-race']){const saved=await call('/api/workspace',{id,kind:'chat',data:{name:id,messages:[]}});assert.equal(saved.status,200);}
 let response=await ask();assert.equal(response.status,200);let data=await response.json();
 check(data.proposals.length===1&&!data.artifacts,'model creates proposal, not file');
 check(requests===1,'proposal needs one model call');
 check(data.usage.input===10&&data.usage.output===5,'single model usage recorded');
 check(data.events.some(e=>e.type==='tool_proposed'),'proposal evidence returned');
 const proposal=data.proposals[0];
 check(Number.isFinite(proposal.expiresAt)&&proposal.expiresAt>Date.now(),'proposal exposes future expiry');
 check(proposal.preview.columns.join(',')==='项目,金额'&&proposal.preview.rows[2][0]==='=1+1'&&!('arguments' in proposal),'proposal exposes safe review sample without raw arguments');
 check(/^[a-f0-9]{64}$/.test(proposal.proposalDigest),'proposal exposes canonical SHA-256 fingerprint');
 data=await(await decide(proposal.id,'status')).json();check(data.status==='pending'&&data.expiresAt===proposal.expiresAt&&data.proposalDigest===proposal.proposalDigest,'status sync reports pending proposal and fingerprint');
 let workspace=await(await call('/api/workspace')).json();
 check(!workspace.records.some(r=>r.kind==='tool_request'),'raw tool arguments hidden from workspace');
 check((await decide(proposal.id,'approve','user-b')).status===400,'other user cannot approve');
 check((await decide(proposal.id,'status','user-a','chat-2')).status===400,'same owner cannot inspect a proposal from another chat');
 check((await decide(proposal.id,'approve','user-a','chat-2')).status===400,'same owner cannot approve a proposal from another chat');
 response=await decide(proposal.id);assert.equal(response.status,200);data=await response.json();const a=data.artifact;
 check(data.status==='completed'&&a.rowCount===3,'approval creates artifact');
 check(data.receipt.status==='completed'&&data.receipt.proposalDigest===proposal.proposalDigest&&data.receipt.artifact.sha256===a.sha256,'completed approval returns fingerprinted audit receipt');
 check(!/arguments|apiKey|objectKey|url/.test(JSON.stringify(data.receipt)),'completed receipt excludes raw arguments, credentials and private locations');
 response=await call(a.url);const bytes=new Uint8Array(await response.arrayBuffer());
 check(response.status===200&&bytes.length===a.size,'authenticated download bytes');
 check(createHash('sha256').update(bytes).digest('hex')===a.sha256,'download hash evidence');
 const sheet=strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml']);
 check(sheet.includes('轴承')&&sheet.includes('<v>30</v>')&&sheet.includes('=1+1')&&!/<f[ >]/.test(sheet),'safe workbook contents');
 mkdirSync('outputs',{recursive:true});writeFileSync('outputs/chat-tool-acceptance.xlsx',bytes);
 data=await(await decide(proposal.id)).json();check(data.reused&&data.artifact.id===a.id,'repeat approval is idempotent');
 data=await(await decide(proposal.id,'status')).json();check(data.reused&&data.status==='completed'&&data.artifact.id===a.id&&data.receipt.artifact.sha256===a.sha256,'status sync restores completed artifact and receipt');
 check((await call(a.url,undefined,'user-b')).status===400,'other user denied download');
 check((await call(a.url,undefined,'')).status===401,'anonymous denied download');
 const record=await db.prepare('SELECT data FROM records WHERE owner=? AND id=?').bind('user-a',a.id).first(),meta=JSON.parse(record.data);
 await bucket.put(meta.objectKey,'tampered');check((await call(a.url)).status===400,'tampered download denied');
 await bucket.delete(meta.objectKey);check((await call(a.url)).status===400,'missing download denied');
 mode='success';data=await(await ask()).json();const rejected=data.proposals[0];
 response=await decide(rejected.id,'reject');check(response.status===200,'reject accepted');data=await response.json();check(data.receipt.status==='rejected'&&!data.receipt.artifact,'rejection returns terminal receipt without artifact');
 data=await(await decide(rejected.id,'reject')).json();check(data.reused&&data.status==='rejected','repeat reject idempotent');
 data=await(await decide(rejected.id,'status')).json();check(data.reused&&data.status==='rejected','status sync restores rejection');
 data=await(await decide(rejected.id,'approve')).json();check(data.reused&&data.status==='rejected','rejected proposal cannot later execute');
 mode='success';data=await(await ask()).json();const altered=data.proposals[0];
 const alteredRow=await db.prepare('SELECT data FROM records WHERE owner=? AND id=?').bind('user-a',altered.id).first(),alteredRecord=JSON.parse(alteredRow.data),alteredArgs=JSON.parse(alteredRecord.arguments);
 alteredArgs.rows[0][1]=999;alteredRecord.arguments=JSON.stringify(alteredArgs);await db.prepare('UPDATE records SET data=? WHERE owner=? AND id=?').bind(JSON.stringify(alteredRecord),'user-a',altered.id).run();
 response=await decide(altered.id);data=await response.json();check(response.status===400&&data.error.includes('完整性校验失败'),'modified proposal is rejected before file generation');
 const alteredArtifacts=await db.prepare("SELECT id FROM records WHERE owner=? AND kind='artifact'").bind('user-a').all();check(alteredArtifacts.results.length===1,'modified proposal creates no artifact');
 mode='success';data=await(await ask()).json();const expiring=data.proposals[0];
 const expiringRow=await db.prepare('SELECT data FROM records WHERE owner=? AND id=?').bind('user-a',expiring.id).first(),expiredRecord={...JSON.parse(expiringRow.data),expiresAt:Date.now()-1};
 await db.prepare('UPDATE records SET data=? WHERE owner=? AND id=?').bind(JSON.stringify(expiredRecord),'user-a',expiring.id).run();
 data=await(await decide(expiring.id,'status')).json();check(data.status==='expired'&&!data.artifact&&data.receipt.status==='expired'&&!data.receipt.artifact,'status sync expires proposal with terminal receipt and no artifact');
 const persistedExpired=JSON.parse((await db.prepare('SELECT data FROM records WHERE owner=? AND id=?').bind('user-a',expiring.id).first()).data);check(persistedExpired.status==='expired','expiry is persisted');
 data=await(await decide(expiring.id)).json();check(data.reused&&data.status==='expired','repeat expired decision is idempotent');
 response=await audit([proposal.id,rejected.id,expiring.id],'user-a',{receipts:[{proposalId:proposal.id,status:'completed',artifact:{sha256:'forged'}}]});assert.equal(response.status,200);data=await response.json();
 check(data.audit.receipts.length===3&&data.audit.receipts.map(r=>r.status).join(',')==='completed,rejected,expired','server audit export restores three authoritative terminal receipts');
 check(data.audit.receipts[0].proposalDigest===proposal.proposalDigest&&data.audit.receipts[0].artifact.sha256===a.sha256,'server audit ignores forged client receipt and binds stored proposal to artifact hash');
 check(!/arguments|apiKey|objectKey|url|forged/.test(JSON.stringify(data.audit)),'server audit export excludes raw parameters, credentials, private locations and client-forged values');
 check((await audit([proposal.id],'user-b')).status===400,'other user cannot export approval audit');
 check((await audit([proposal.id,proposal.id])).status===400,'duplicate audit identifiers fail closed');
 check((await audit([proposal.id],'user-a',{chatId:'chat-2'})).status===400,'same owner cannot relabel approval audit to another chat');
 const legacyRow=await db.prepare('SELECT data FROM records WHERE owner=? AND id=?').bind('user-a',proposal.id).first(),legacyRecord=JSON.parse(legacyRow.data);delete legacyRecord.chatId;
 await db.prepare('UPDATE records SET data=? WHERE owner=? AND id=?').bind(JSON.stringify(legacyRecord),'user-a',proposal.id).run();
 check((await audit([proposal.id])).status===400,'legacy proposal without authoritative chat binding fails closed');
 mode='widepreview';data=await(await ask()).json();const wide=data.proposals[0];
 check(wide.preview.columns.length===6&&wide.preview.rows.length===5,'preview is bounded to six columns and five rows');
 check(wide.preview.hiddenColumns===2&&wide.preview.hiddenRows===1,'preview reports hidden dimensions');
 check(wide.preview.rows[4][5]==='第5行第6列','preview preserves intended visible values');
 await decide(wide.id,'reject');
 mode='success';data=await(await ask('chat-deleted')).json();const deletedChatProposal=data.proposals[0];
 check((await remove('/api/workspace?id=chat-deleted')).status===200,'chat deletion succeeds with a pending proposal');
 check(!(await db.prepare('SELECT id FROM records WHERE owner=? AND id=?').bind('user-a',deletedChatProposal.id).first()),'chat deletion removes its pending proposal');
 check((await decide(deletedChatProposal.id,'status','user-a','chat-deleted')).status===400,'deleted chat invalidates pending proposal status');
 check((await decide(deletedChatProposal.id,'approve','user-a','chat-deleted')).status===400,'deleted chat invalidates pending proposal approval');
 mode='success';data=await(await ask('chat-executing')).json();const executingProposal=data.proposals[0],executingRow=await db.prepare('SELECT data FROM records WHERE owner=? AND id=?').bind('user-a',executingProposal.id).first(),executingRecord={...JSON.parse(executingRow.data),status:'executing'};
 await db.prepare('UPDATE records SET data=? WHERE owner=? AND id=?').bind(JSON.stringify(executingRecord),'user-a',executingProposal.id).run();
 check((await remove('/api/workspace?id=chat-executing')).status===200&&!(await db.prepare('SELECT id FROM records WHERE owner=? AND id=?').bind('user-a',executingProposal.id).first()),'chat deletion removes an executing proposal');
 mode='success';data=await(await ask('chat-terminal')).json();const terminalProposal=data.proposals[0];check((await decide(terminalProposal.id,'approve','user-a','chat-terminal')).status===200,'terminal proposal completes before chat deletion');
 check((await remove('/api/workspace?id=chat-terminal')).status===200,'chat with completed proposal can be deleted');
 const terminalRow=await db.prepare('SELECT data FROM records WHERE owner=? AND id=?').bind('user-a',terminalProposal.id).first();check(JSON.parse(terminalRow.data).status==='completed','chat deletion preserves completed audit record');
 check((await audit([terminalProposal.id],'user-a',{chatId:'chat-terminal'})).status===200,'completed audit remains exportable after chat deletion');
 mode='delete-before-proposal';response=await ask('chat-race');data=await response.json();check(response.status===200&&data.proposals.length===0&&data.events.some(event=>event.type==='tool_error'&&event.message.includes('原始对话已删除')),'chat deleted during model response cannot receive a late proposal');
 check(!(await db.prepare("SELECT id FROM records WHERE owner=? AND kind='tool_request' AND json_extract(data,'$.chatId')=?").bind('user-a','chat-race').first()),'late proposal leaves no hidden record');
 for(const invalid of ['invalid','duplicate','oversized']){mode=invalid;data=await(await ask()).json();check(data.proposals.length===0&&data.events.some(e=>e.type==='tool_error'),invalid+' cannot create proposal');}
 for(const rejectedMode of ['parallel','truncated','unknown']){mode=rejectedMode;response=await ask();check(response.status===400,rejectedMode+' rejected before proposal');}
 mode='success';const ordinary=await call('/api/chat',{profileId:'managed-deepseek',messages:[{role:'user',content:'你好'}]});data=await ordinary.json();check(!data.proposals&&!data.artifacts,'legacy text chat unchanged');
}finally{await fixture.dispose();}
let guardedRequests=0;
const guarded=await createWorkerFixture({bindings:{DEEPSEEK_API_KEY:'synthetic-key'},outboundService:async req=>{
 guardedRequests++;const payload=await req.json();check(!payload.tools,'disabled runtime never sends tool definitions');
 return new WorkerResponse(JSON.stringify({choices:[{message:{content:'普通回复'},finish_reason:'stop'}],usage:{prompt_tokens:3,completion_tokens:2}}),{headers:{'Content-Type':'application/json'}});
}});
try{
 const db=await guarded.mf.getD1Database('DB');
 for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+name,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 let response=await guarded.mf.dispatchFetch('http://fixture.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://fixture.test','oai-authenticated-user-id':'user-a'},body:JSON.stringify({profileId:'managed-deepseek',documentTools:true,messages:[{role:'user',content:'生成 XLSX'}]})});
 let data=await response.json();check(response.status===200&&data.text==='普通回复'&&!data.proposals,'disabled runtime falls back to ordinary chat');
 check(guardedRequests===1,'disabled runtime makes one ordinary model request');
 response=await guarded.mf.dispatchFetch('http://fixture.test/api/document-tool',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://fixture.test','oai-authenticated-user-id':'user-a'},body:JSON.stringify({id:'missing',action:'approve'})});
 data=await response.json();check(response.status===400&&data.error.includes('尚未启用'),'disabled approval endpoint fails closed');
}finally{await guarded.dispose();}
console.log(`PASS: ${checks} document-agent approval and release-guard assertions; real workerd/D1/R2/XLSX, simulated model. No paid requests.`);
