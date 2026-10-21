import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createWorkerFixture,WorkerResponse} from './worker-fixture.mjs';

let calls=0,mode='success',release,arrived,checks=0;
const outboundArrived=()=>new Promise(resolve=>{arrived=resolve});
let waiting=outboundArrived();
const fixture=await createWorkerFixture({bindings:{DEEPSEEK_API_KEY:'synthetic-key'},outboundService:async()=>{
 calls++;arrived?.();
 if(mode==='hold')await new Promise(resolve=>{release=resolve});
 if(mode==='fail')return new WorkerResponse('simulated',{status:500});
 return new WorkerResponse(JSON.stringify({choices:[{message:{content:'唯一回复'},finish_reason:'stop'}],usage:{prompt_tokens:4,completion_tokens:2}}),{headers:{'Content-Type':'application/json'}});
}});
const check=(value,label)=>{assert.ok(value,label);checks++};
const call=async(path,payload,user='user-a',method='POST')=>{const response=await fixture.mf.dispatchFetch('http://fixture.test'+path,{method,headers:{'Content-Type':'application/json','Origin':'http://fixture.test','oai-authenticated-user-id':user},body:payload?JSON.stringify(payload):undefined});return {status:response.status,data:await response.json()};};
const saveChat=async(messages,user='user-a',name='幂等验收')=>{const current=await (await fixture.mf.getD1Database('DB')).prepare("SELECT updated FROM records WHERE owner=? AND id=? AND kind='chat'").bind(user,'chat-1').first();return call('/api/workspace',{id:'chat-1',kind:'chat',data:{name,messages},...(current?{baseUpdated:current.updated}:{})},user);};
const payload=(requestId,content='请回答')=>({requestId,chatId:'chat-1',profileId:'managed-deepseek',messages:[{role:'user',content}]});

try{
 const db=await fixture.mf.getD1Database('DB');
 for(const name of readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+name,'utf8').split('--> statement-breakpoint').map(value=>value.trim()).filter(Boolean))await db.prepare(sql).run();
 for(const user of ['user-a','user-b'])check((await saveChat([],user)).status===200,`${user} owns an independent persisted chat`);

 mode='hold';waiting=outboundArrived();
 check((await saveChat([{role:'user',content:'请回答',requestId:'request-concurrent-1'}])).status===200,'browser persists the request id with the user message before model execution');
 const firstPromise=call('/api/chat',payload('request-concurrent-1'));
 await waiting;
 const duplicate=await call('/api/chat',payload('request-concurrent-1'));
 check(duplicate.status===400&&duplicate.data.error.includes('处理中'),'concurrent duplicate is rejected while the first request owns the claim');
 check(calls===1,'concurrent duplicate does not call the model provider');
 const pendingRecovery=await call('/api/chat?chatId=chat-1&requestId=request-concurrent-1',undefined,'user-a','GET');
 check(pendingRecovery.status===400&&pendingRecovery.data.error.includes('处理中')&&calls===1,'refresh recovery refuses an unfinished response without calling the provider');
 release();const first=await firstPromise;
 check(first.status===200&&first.data.text==='唯一回复','claim owner completes normally');
 const persistedChat=JSON.parse((await db.prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='chat'").bind('user-a','chat-1').first()).data);
 check(persistedChat.messages.length===2&&persistedChat.messages[1].role==='assistant'&&persistedChat.messages[1].requestId==='request-concurrent-1'&&persistedChat.messages[1].content==='唯一回复','completed reply is appended to the durable chat before the HTTP response is needed');
 const replay=await call('/api/chat',payload('request-concurrent-1'));
 check(replay.status===200&&replay.data.reused===true&&replay.data.text==='唯一回复','completed duplicate replays the stored response');
 check(calls===1,'completed replay creates no second model charge');
 const replayedChat=JSON.parse((await db.prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='chat'").bind('user-a','chat-1').first()).data);
 check(replayedChat.messages.length===2,'completed replay does not append a duplicate assistant message');
 const recovered=await call('/api/chat?chatId=chat-1&requestId=request-concurrent-1',undefined,'user-a','GET');
 check(recovered.status===200&&recovered.data.reused===true&&recovered.data.text==='唯一回复'&&calls===1,'completed response is recovered after refresh without request payload or provider call');
 const mismatch=await call('/api/chat',payload('request-concurrent-1','不同内容'));
 check(mismatch.status===400&&mismatch.data.error.includes('其他内容')&&calls===1,'request id cannot be rebound to different content');

 const crossOwnerRecovery=await call('/api/chat?chatId=chat-1&requestId=request-concurrent-1',undefined,'user-b','GET');
 check(crossOwnerRecovery.status===400&&crossOwnerRecovery.data.error.includes('没有可恢复')&&calls===1,'another authenticated owner cannot recover the response');
 check((await saveChat([{role:'user',content:'请回答',requestId:'request-concurrent-1'}],'user-b','独立用户')).status===200,'other owner saves an independent pending user message');
 mode='success';const otherOwner=await call('/api/chat',payload('request-concurrent-1'),'user-b');
 check(otherOwner.status===200&&calls===2,'same request id is isolated by authenticated owner');
 const otherChat=JSON.parse((await db.prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='chat'").bind('user-b','chat-1').first()).data);
 check(otherChat.messages.length===2&&otherChat.messages[1].requestId==='request-concurrent-1','server persistence remains isolated by authenticated owner');
 const beforeDelete=await db.prepare('SELECT status FROM chat_requests WHERE owner=? AND chat=?').bind('user-a','chat-1').all();
 check(beforeDelete.results.length===1&&beforeDelete.results[0].status==='completed','completed replay evidence is persisted');
 const deleteRevision=(await db.prepare("SELECT updated FROM records WHERE owner=? AND id=? AND kind='chat'").bind('user-a','chat-1').first()).updated;
 check((await call('/api/workspace?id=chat-1&baseUpdated='+deleteRevision,undefined,'user-a','DELETE')).status===200,'chat deletion succeeds with the current revision');
 check(!(await db.prepare('SELECT id FROM chat_requests WHERE owner=? AND chat=?').bind('user-a','chat-1').first()),'chat deletion removes its replay data');
 const deletedRecovery=await call('/api/chat?chatId=chat-1&requestId=request-concurrent-1',undefined,'user-a','GET');
 check(deletedRecovery.status===400&&deletedRecovery.data.error.includes('记录不存在')&&calls===2,'deleted chat cannot recover a stale response');
 const afterDelete=await call('/api/chat',payload('request-after-delete'));
 check(afterDelete.status===400&&afterDelete.data.error.includes('记录不存在')&&calls===2,'deleted chat fails before another provider call');

 check((await saveChat([{role:'user',content:'请回答',requestId:'request-retry-failure'}],'user-a','恢复测试')).status===200,'chat can be recreated for failure recovery');
 mode='fail';const failed=await call('/api/chat',payload('request-retry-failure'));
 check(failed.status===400&&calls===3,'provider failure is reported');
 check(!(await db.prepare('SELECT id FROM chat_requests WHERE owner=? AND id=?').bind('user-a','request-retry-failure').first()),'failed request releases its claim for an explicit retry');
 mode='success';const retried=await call('/api/chat',payload('request-retry-failure'));
 check(retried.status===200&&retried.data.text==='唯一回复'&&calls===4,'explicit retry after a failed provider call can complete');
 const retryChat=JSON.parse((await db.prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='chat'").bind('user-a','chat-1').first()).data);
 check(retryChat.messages.length===2&&retryChat.messages[1].requestId==='request-retry-failure','successful explicit retry is durably appended once');

 mode='hold';waiting=outboundArrived();
 check((await saveChat([{role:'user',content:'请回答',requestId:'request-cas-conflict'}],'user-a','并发编辑')).status===200,'concurrency sample starts from a persisted pending message');
 const conflictPromise=call('/api/chat',payload('request-cas-conflict'));
 await waiting;
 check((await saveChat([{role:'user',content:'请回答',requestId:'request-cas-conflict'},{role:'user',content:'另一标签的新问题',requestId:'request-newer-2'}],'user-a','并发编辑')).status===200,'another tab changes the chat while the model is running');
 release();const conflictResult=await conflictPromise;
 check(conflictResult.status===200&&calls===5,'model completion remains recoverable after a concurrent chat change');
 const conflictedChat=JSON.parse((await db.prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='chat'").bind('user-a','chat-1').first()).data);
 check(conflictedChat.messages.length===3&&conflictedChat.messages[0].requestId==='request-cas-conflict'&&conflictedChat.messages[1].role==='assistant'&&conflictedChat.messages[1].requestId==='request-cas-conflict'&&conflictedChat.messages[2].requestId==='request-newer-2','server completion merges after its exact user message without overwriting a newer chat message');
 const conflictRecovery=await call('/api/chat?chatId=chat-1&requestId=request-cas-conflict',undefined,'user-a','GET');
 check(conflictRecovery.status===200&&conflictRecovery.data.text==='唯一回复'&&calls===5,'conflicted response remains available without another provider call');
 const recoveredConflictChat=JSON.parse((await db.prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='chat'").bind('user-a','chat-1').first()).data);
 check(recoveredConflictChat.messages.length===3,'conflict recovery does not duplicate the merged assistant response');

 mode='hold';waiting=outboundArrived();
 check((await saveChat([{role:'user',content:'请回答',requestId:'request-removed-conflict'}],'user-a','删除冲突')).status===200,'deletion conflict starts from a persisted pending message');
 const removedPromise=call('/api/chat',payload('request-removed-conflict'));
 await waiting;
 check((await saveChat([{role:'user',content:'替代问题',requestId:'request-replacement-3'}],'user-a','删除冲突')).status===200,'another tab removes the original message before model completion');
 release();const removedResult=await removedPromise;
 check(removedResult.status===200&&calls===6,'removed-message completion remains recoverable without forcing a chat merge');
 const removedChat=JSON.parse((await db.prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='chat'").bind('user-a','chat-1').first()).data);
 check(removedChat.messages.length===1&&removedChat.messages[0].requestId==='request-replacement-3','server refuses to insert a reply when its original user message no longer exists');
 const removedRecovery=await call('/api/chat?chatId=chat-1&requestId=request-removed-conflict',undefined,'user-a','GET');
 check(removedRecovery.status===200&&removedRecovery.data.text==='唯一回复'&&calls===6,'removed-message response is still recoverable without another provider call');
 const removedAfterRecovery=JSON.parse((await db.prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='chat'").bind('user-a','chat-1').first()).data);
 check(removedAfterRecovery.messages.length===1&&removedAfterRecovery.messages[0].requestId==='request-replacement-3','recovery does not attach a reply to the wrong user message');

 mode='success';const legacy=await call('/api/chat',{profileId:'managed-deepseek',messages:[{role:'user',content:'旧调用'}]});
 check(legacy.status===200&&calls===7,'non-interactive legacy callers remain compatible without a request id');
 console.log(`PASS: ${checks} chat idempotency assertions; actual workerd/D1 concurrency, simulated model. No paid requests.`);
}finally{await fixture.dispose();}
