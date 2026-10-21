import {loadUI} from './helpers/load-ui.mjs';
import {JSDOM} from 'jsdom';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {initialState,Store} from '../core.mjs';
import {ToolRuntime} from '../runtime/tools.mjs';

// Native bridge and model responses are fixtures. These tests do not run Electron.
async function fixture(){
 const dom=new JSDOM(await readFile(new URL('../src/index.html',import.meta.url),'utf8'),{url:'file:///desktop/src/index.html',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const s=initialState(),calls=[];s.settings.hasKey=true;s.folders=[{id:'f',name:'项目资料',path:'/fixture'}];
 let runtimeListener,streamListener;
 const bridge={state:async()=>structuredClone(s),onRuntime:fn=>{runtimeListener=fn;},onStream:fn=>{streamListener=fn;},listFiles:async p=>{calls.push(['list',p]);return {files:[{folderId:'f',relative:'report.md',name:'report.md'}]};},readFile:async p=>{calls.push(['read',p]);return {...p,name:'report.md',text:'# 授权资料\n正文'};},exportText:async p=>{calls.push(['export',p]);},cancelChat:async p=>{calls.push(['cancel',p]);return true;},chat:async()=>structuredClone(s)};
 w.actwill=bridge;await loadUI(w);
 const settle=ms=>new Promise(r=>setTimeout(r,ms||25));await settle();
 const click=async selector=>{const el=w.document.querySelector(selector);assert.ok(el,selector);el.click();await settle();};
 const fill=(selector,value)=>{const el=w.document.querySelector(selector);el.value=value;el.setSelectionRange?.(value.length,value.length);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const key=async value=>{w.document.querySelector('#prompt').dispatchEvent(new w.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));await settle();};
 return {dom,w,s,calls,bridge,settle,click,fill,key,notify:()=>runtimeListener?.(),stream:e=>streamListener?.(e)};
}

test('split workspace safely renders Markdown, switches tabs, exports exact text and continues with a draft',async()=>{
 const f=await fixture();try{const {w,s,click,fill,calls}=f;
 const text='# 项目方案\n\n| 阶段 | 验收 |\n| --- | --- |\n| 一 | 测试通过 |\n\n- 先检查\n- 再执行\n\n```html\n<script>window.pwned=true</script>\n```';
 s.chats=[{id:'c',name:'项目方案',time:Date.now(),messages:[{role:'user',content:'写方案'},{role:'assistant',content:text}]}];await click('[data-action="panelToggle"]');await click('[data-action="new"]');
 // Refresh through the existing bridge before selecting the task.
 await w.eval("update('state')");await click('[data-action="openChat"][data-id="c"]');await click('[data-action="previewMessage"]');
 assert.equal(w.document.querySelectorAll('.document-preview table tbody tr').length,1);assert.equal(w.document.querySelectorAll('.document-preview li').length,2);assert.equal(w.pwned,undefined);assert.equal(w.document.querySelector('.document-preview script'),null);
 await click('[data-action="previewExport"]');assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))),['export',{name:'项目方案',text}]);
 fill('#prompt','请保留蓝色主题');await click('[data-action="previewContinue"]');assert.match(w.document.querySelector('#prompt').value,/请保留蓝色主题/);assert.match(w.document.querySelector('#prompt').value,/参考原文/);
 await click('[data-action="previewMode"]');assert.equal(w.document.querySelector('.document-preview pre').textContent,text);
 await click('[data-action="panelClose"]');assert.equal(w.document.querySelector('.session-panel'),null);await click('[data-action="panelToggle"]');assert.match(w.document.querySelector('.document-preview').textContent,/项目方案/);
 await click('[data-action="previewClose"]');assert.match(w.document.querySelector('.panel-empty').textContent,/把成果放在手边/);
 }finally{f.dom.window.close();}
});

test('@ selects only granted file references and slash selects real agents without sending a model request',async()=>{
 const f=await fixture();try{const {w,fill,key,settle,click,calls,bridge}=f;let request;
 fill('#prompt','整理 @report');await settle();assert.equal(w.document.querySelector('[role="option"]').textContent.includes('report.md'),true);await key('Enter');assert.match(w.document.querySelector('.chips').textContent,/report.md/);assert.equal(w.document.querySelector('#prompt').value,'整理 ');
 await click('[data-action="attachedPreview"]');assert.match(w.document.querySelector('.document-preview').textContent,/授权资料/);
 fill('#prompt','/研究');await settle();await key('Enter');assert.equal(w.document.querySelector('#agent').value,'research');assert.equal(w.document.querySelector('#prompt').value,'');
 bridge.chat=async p=>{request=p;return structuredClone(f.s);};fill('#prompt','根据资料分析');await click('[data-action="send"]');assert.equal(request.agentId,'research');assert.deepEqual(JSON.parse(JSON.stringify(request.files)),[{folderId:'f',relative:'report.md'}]);assert.equal('text' in request.files[0],false);assert.ok(calls.some(([type,p])=>type==='read'&&p.folderId==='f'));
 }finally{f.dom.window.close();}
});

test('live execution keeps focus, draft and disclosure state; run records do not leak between turns',async()=>{
 const f=await fixture();try{const {w,s,click,fill,bridge,notify,settle}=f;let finish;
 bridge.chat=async p=>{s.chats=[{id:p.id,name:p.prompt,time:Date.now(),run:{id:'new',status:'running',startedAt:Date.now()},messages:[{role:'user',content:p.prompt,runId:'new'}]}];s.executions=[{id:'old',chatId:p.id,runId:'old',tool:'cli_execute',time:1,status:'failed',result:{error:'OLD_RUN_ONLY'}},{id:'current',chatId:p.id,runId:'new',tool:'cli_execute',time:Date.now(),status:'pending_approval',args:{executable:'node'}}];notify();return new Promise(r=>{finish=r;});};
 fill('#prompt','检查项目');await click('[data-action="send"]');await settle(180);assert.match(w.document.querySelector('.run-wait').textContent,/等待你在系统窗口确认/);assert.ok(!w.document.querySelector('.messages').textContent.includes('OLD_RUN_ONLY'));
 const d=w.document.querySelector('[data-detail="current"]');d.open=true;fill('#prompt','下一条指令尚未发送');w.document.querySelector('#prompt').focus();w.document.querySelector('#prompt').setSelectionRange(2,4);s.executions[1].status='denied';s.executions[1].result={status:'denied'};notify();await settle(180);
 assert.equal(w.document.activeElement.id,'prompt');assert.equal(w.document.querySelector('#prompt').selectionStart,2);assert.equal(w.document.querySelector('#prompt').value,'下一条指令尚未发送');assert.equal(w.document.querySelector('[data-detail="current"]').open,true);assert.match(w.document.querySelector('.run-trace').textContent,/已拒绝/);
 await click('[data-action="stop"]');assert.equal(f.calls.at(-1)[0],'cancel');s.chats[0].run.status='cancelled';s.chats[0].run.finishedAt=Date.now();s.chats[0].messages.push({role:'assistant',content:'请求已停止',error:true,runId:'new'});finish(structuredClone(s));await settle();assert.match(w.document.querySelector('.conversation-status').textContent,/已取消/);assert.equal(w.document.querySelector('#prompt').value,'下一条指令尚未发送');
 }finally{f.dom.window.close();}
});

test('execution run ID survives denial, persistence and reload without executing a command',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'willbuddy-run-'));try{const store=new Store(dir);await store.load();const runtime=new ToolRuntime({store,browser:{},approve:async()=>false});await runtime.execute('browser_open',{url:'https://example.com'},undefined,{chatId:'chat',runId:'request-2'});const reloaded=new Store(dir);await reloaded.load();assert.equal(reloaded.data.executions[0].runId,'request-2');assert.equal(reloaded.data.executions[0].chatId,'chat');assert.equal(reloaded.data.executions[0].status,'denied');}finally{await rm(dir,{recursive:true,force:true});}
});


test('stream events keep draft/focus, ignore stale chunks and cannot resurrect a completed run',async()=>{
 const f=await fixture();try{const {w,s,click,fill,settle,stream,notify}=f;const startedAt=Date.now();s.chats=[{id:'c',name:'流式任务',time:startedAt,run:{id:'r',status:'running',startedAt},messages:[{role:'user',content:'测试',runId:'r'}]}];await w.eval("update('state')");await click('[data-action="openChat"][data-id="c"]');
 const event={version:1,type:'text',chatId:'c',runId:'r',messageId:'m',sequence:2,content:'# 已接收\n\n第二段',startedAt,time:startedAt};stream(event);await settle(60);assert.match(w.document.querySelector('.message-content h1').textContent,/已接收/);fill('#prompt','未发送草稿');const input=w.document.querySelector('#prompt');input.focus();input.setSelectionRange(1,3);
 stream({...event,sequence:1,content:'STALE'});stream({...event,sequence:3,content:event.content+'\n\n**实时更新**'});await settle(60);assert.equal(w.document.querySelector('#prompt'),input);assert.equal(input.selectionStart,1);assert.equal(input.value,'未发送草稿');assert.match(w.document.querySelector('.message.assistant').textContent,/实时更新/);assert.ok(!w.document.body.textContent.includes('STALE'));
 // An older in-flight state snapshot must not replace the newer stream text.
 notify();await settle(180);assert.match(w.document.querySelector('.message.assistant').textContent,/实时更新/);
 s.chats[0].run.status='completed';s.chats[0].messages.push({id:'m',role:'assistant',content:'最终结果',sequence:3,runId:'r',streaming:false});notify();await settle(180);stream({...event,sequence:99,content:'LATE'});await settle(60);assert.match(w.document.querySelector('.message.assistant').textContent,/最终结果/);assert.ok(!w.document.body.textContent.includes('LATE'));assert.equal(w.document.querySelector('[data-streaming="true"]'),null);
 }finally{f.dom.window.close();}
});
