import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {complete,Store,initialState} from '../core.mjs';
import {readCompletion} from '../runtime/model-stream.mjs';
import {runAgent} from '../runtime/agent.mjs';
import {ToolRuntime} from '../runtime/tools.mjs';
import {createConversationService} from '../services/conversation.mjs';
const event=p=>'data: '+JSON.stringify(p)+'\n\n';
const token=text=>event({choices:[{index:0,delta:{content:text}}]});
const end=event({choices:[{index:0,delta:{},finish_reason:'stop'}]})+'data: [DONE]\n\n';
const response=(data,bytewise=false)=>new Response(new ReadableStream({start(c){const bytes=new TextEncoder().encode(data);if(bytewise)for(const b of bytes)c.enqueue(Uint8Array.of(b));else c.enqueue(bytes);c.close();}}),{headers:{'content-type':'text/event-stream'}});
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
async function server(fn){const instance=createServer(fn);await new Promise(r=>instance.listen(0,'127.0.0.1',r));return {url:'http://127.0.0.1:'+instance.address().port,close:()=>new Promise(r=>{instance.closeAllConnections();instance.close(r);})};}

test('real HTTP stream exposes Chinese Markdown before completion and preserves split UTF-8, usage and CRLF',async()=>{
 const first=deferred(),release=deferred(),received=[];let request;
 const s=await server(async(req,res)=>{let body='';for await(const b of req)body+=b;request=JSON.parse(body);res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(token('# 中文标题\n\n'));await release.promise;res.end(token('**第二段**')+event({choices:[{delta:{},finish_reason:'stop'}],usage:{total_tokens:9}})+'data: [DONE]\n\n');});
 try{let settled=false;const pending=complete({baseUrl:s.url,model:'fixture'},'',[],undefined,undefined,{onDelta:chunk=>{received.push(chunk);first.resolve();}}).then(r=>{settled=true;return r;});await first.promise;assert.equal(settled,false);assert.equal(request.stream,true);assert.deepEqual(received,['# 中文标题\n\n']);release.resolve();const out=await pending;assert.equal(out.text,'# 中文标题\n\n**第二段**');assert.equal(out.usage.total_tokens,9);
 const split=await readCompletion(response((': comment\n'+token('中文 🧭')+end).replace(/\n/g,'\r\n'),true),{onDelta:chunk=>assert.equal(chunk,'中文 🧭')});assert.equal(split.text,'中文 🧭');
 }finally{release.resolve();await s.close();}
});

test('SSE tool fragments assemble by index, then real Node CLI runs only after the completed frame',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'willbuddy-stream-cli-'));let approvalCount=0,requests=0;
 const store=new Store(dir);await store.load();store.data.folders=[{id:'f',path:dir,name:'fixture'}];const runtime=new ToolRuntime({store,browser:{},approve:async()=>{approvalCount++;return true;}});
 const s=await server(async(req,res)=>{let body='';for await(const b of req)body+=b;const data=JSON.parse(body);assert.equal(data.stream,true);res.writeHead(200,{'Content-Type':'text/event-stream'});requests++;
 if(requests===1){res.write(event({choices:[{delta:{tool_calls:[{index:0,id:'cli-call',type:'function',function:{name:'cli_execute',arguments:'{"executable":'}}]}}]}));assert.equal(approvalCount,0);res.end(event({choices:[{delta:{tool_calls:[{index:0,function:{arguments:JSON.stringify(process.execPath)+',"args":["-e","process.stdout.write(\\"STREAM_CLI_OK\\")"],"folderId":"f"}'}}]},finish_reason:'tool_calls'}]})+'data: [DONE]\n\n');}
 else{assert.match(data.messages.find(m=>m.role==='tool').content,/STREAM_CLI_OK/);res.end(token('已核对真实命令输出。')+end);}});
 try{const out=await runAgent({messages:[{role:'user',content:'运行测试'}],request:(messages,tools,options)=>complete({baseUrl:s.url,model:'fixture'},'',messages,undefined,tools,options),execute:(...args)=>runtime.execute(...args)});assert.match(out.text,/真实命令/);assert.equal(approvalCount,1);assert.equal(requests,2);assert.match(store.data.executions[0].result.stdout,/STREAM_CLI_OK/);}finally{await s.close();await rm(dir,{recursive:true,force:true});}
});

test('JSON-only compatible providers deliver once; non-stream callers continue sending stream:false',async()=>{
 const deltas=[];const result=await readCompletion(new Response(JSON.stringify({choices:[{message:{role:'assistant',content:'JSON fallback'}}]}),{headers:{'content-type':'application/json'}}),{onDelta:t=>deltas.push(t)});assert.equal(result.text,'JSON fallback');assert.deepEqual(deltas,['JSON fallback']);
 const s=await server(async(req,res)=>{let b='';for await(const c of req)b+=c;assert.equal(JSON.parse(b).stream,false);res.end(JSON.stringify({choices:[{message:{role:'assistant',content:'normal'}}]}));});try{assert.equal((await complete({baseUrl:s.url,model:'fixture'},'',[])).text,'normal');}finally{await s.close();}
});

test('truncated, malformed, length-limited or explicit-error streams fail and never execute incomplete tools',async()=>{
 for(const [data,error] of [[token('未结束'),/意外中断/],['data: {invalid}\n\n',/无效 JSON/],[token('保留内容')+event({choices:[{delta:{},finish_reason:'length'}]}),/长度上限/],[event({error:{message:'provider failed'}}),/provider failed/],[event({choices:[{delta:{tool_calls:[{index:0,id:'t',function:{name:'cli_execute',arguments:'{"executable":'}}]},finish_reason:'tool_calls'}]})+'data: [DONE]\n\n',/参数未完整/]]){let executed=0;await assert.rejects(runAgent({messages:[],request:()=>readCompletion(response(data),{toolsEnabled:true}),execute:async()=>{executed++;}}),error);assert.equal(executed,0);}
});

test('stream size limit and disabled-tool mode fail closed',async()=>{
 await assert.rejects(readCompletion(response('data: '+ 'x'.repeat(4*1024*1024))),/4 MB/);
 await assert.rejects(readCompletion(response(event({choices:[{delta:{tool_calls:[{index:0,id:'x',function:{name:'x',arguments:'{}'}}]}}]})+end)),/工具模式关闭/);
});

test('conversation persists one final message, ordered events and tool-round prelude without duplicate final text',async()=>{
 const store={data:initialState(),save:async()=>{},log:()=>{}},events=[],active=new Map();let count=0;
 const service=createConversationService({store,active,key:()=>'',view:()=>store.data,executeTool:async()=>({status:'denied'}),notifyStream:e=>events.push(e),request:async(_s,_k,_m,_signal,_tools,{onDelta})=>{count++;if(count===1){await onDelta('先检查网页。');return {message:{role:'assistant',content:'先检查网页。',tool_calls:[{id:'b',function:{name:'browser_open',arguments:'{"url":"https://example.com"}'}}]}};}await onDelta('# 最终');await onDelta('\n\n已拒绝操作。');return {text:'# 最终\n\n已拒绝操作。'};}});
 const result=await service.run({id:'c',prompt:'检查',toolsEnabled:true});const chat=result.chats[0];assert.equal(chat.run.status,'completed');assert.equal(active.size,0);assert.equal(chat.messages.filter(m=>m.content==='# 最终\n\n已拒绝操作。').length,1);assert.equal(chat.messages.find(m=>m.content==='先检查网页。').intermediate,true);assert.deepEqual(events.map(e=>e.sequence),[1,2,3]);assert.equal(events[1].messageId,events[2].messageId);assert.equal(events[2].runId,chat.run.id);assert.equal(chat.messages.at(-1).streaming,false);
});

test('real HTTP cancellation retains a persisted partial message and does not replay or complete the request',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'willbuddy-stream-cancel-')),store=new Store(dir);await store.load();const first=deferred();let requests=0;
 const s=await server(async(req,res)=>{requests++;res.writeHead(200,{'content-type':'text/event-stream'});res.write(token('已经接收的内容'));});
 try{store.data.settings={baseUrl:s.url,model:'fixture'};const active=new Map();const service=createConversationService({store,active,key:()=>'',view:()=>store.data,executeTool:async()=>{throw Error('No tools expected');},notifyStream:()=>first.resolve()});const pending=service.run({id:'c',prompt:'测试'});await first.promise;service.cancel('c');await pending;const reloaded=new Store(dir);await reloaded.load();const chat=reloaded.data.chats[0];assert.equal(chat.run.status,'cancelled');const partial=chat.messages.find(m=>m.content==='已经接收的内容');assert.equal(partial.partial,true);assert.equal(partial.streaming,false);assert.equal(requests,1);assert.equal(active.size,0);}finally{await s.close();await rm(dir,{recursive:true,force:true});}
});


test('SSE supports bare CR and multiline data fields without treating comments as content',async()=>{
 const source=': keepalive\rdata: {"choices":[{\rdata: "delta":{"content":"多行事件"},"finish_reason":"stop"}]}\r\rdata: [DONE]\r\r';assert.equal((await readCompletion(response(source,true))).text,'多行事件');
});
