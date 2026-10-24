import {loadUI} from './helpers/load-ui.mjs';
import {JSDOM} from 'jsdom';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {initialState} from '../core.mjs';
test('desktop UI flows: settings, attachment, chat, escaping, artifact, agents, memory, tasks and search', async()=>{
const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
const dom=new JSDOM(html,{url:'file:///desktop/src/index.html',runScripts:'outside-only'});
const w=dom.window;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
const s=initialState();s.settings.hasKey=true;s.settings.secureStorage=true;
s.folders=[{id:'folder',name:'项目资料',path:'/tmp/actwill-fixture'}];
let calls=[];
s.browsers=[];s.executions=[];

w.actwill={state:async()=>structuredClone(s),pickFolder:async()=>structuredClone(s),listFiles:async()=>({files:[{folderId:'folder',relative:'report.md',name:'report.md'}]}),readFile:async p=>({...p,text:'# 项目资料',name:'report.md'}),settings:async p=>{calls.push(p);Object.assign(s.settings,p);return structuredClone(s);},chat:async p=>{calls.push(p);s.chats.unshift({id:p.id,name:p.prompt,messages:[{role:'user',content:p.prompt},{role:'assistant',content:'**真实界面测试**\n<script>window.pwned=true</script>'}]});return structuredClone(s);},artifact:async p=>{s.artifacts.push({id:'artifact',...p,time:Date.now()});return structuredClone(s);},agent:async p=>{s.agents.push({id:'custom',...p});return structuredClone(s);},memory:async p=>{s.memories.push({id:'mem',...p});return structuredClone(s);},task:async p=>{s.tasks.push({id:'task',...p,status:'ready'});return structuredClone(s);}};
Object.assign(w.actwill,{
 openBrowser:async p=>{calls.push({type:'browser',...p});s.browsers.push({id:'b',title:'网页夹具',url:p.url});return {status:'opened'};},
 readBrowser:async()=>({status:'read',url:'https://example.com',text:'正文夹具'}),
 enqueueCommand:async p=>{calls.push({type:'cli',...p});s.executions.unshift({id:'exec',tool:'cli_execute',args:p,time:Date.now(),status:'succeeded',result:{status:'succeeded',stdout:'CLI fixture output',stderr:'',exitCode:0}});return {status:'succeeded'};},
 inspectBrowser:async()=>({status:'inspected',id:'b',snapshotId:'snapshot',url:'https://example.com',elements:[{ref:'e1',kind:'input',label:'关键词',tag:'INPUT'},{ref:'e2',kind:'click',label:'搜索',tag:'BUTTON'}]}),
 browserAction:async p=>{calls.push({type:'browserAction',...p});return {status:p.operation==='browser_fill'?'filled':'clicked'};},
 cancelCommand:async()=>true
});
await loadUI(w);
const settle=()=>new Promise(r=>setTimeout(r,20));
const click=async sel=>{assert.ok(w.document.querySelector(sel),sel);w.document.querySelector(sel).click();await settle();};
const fill=(sel,value)=>{w.document.querySelector(sel).value=value;w.document.querySelector(sel).dispatchEvent(new w.Event('input',{bubbles:true}));};
await settle();assert.match(w.document.body.textContent,/想一起完成什么/);
await click('[data-action="settings"]');fill('[name="name"]','验收工作台');await click('#modalSubmit');assert.equal(calls.at(-1).name,'验收工作台');
await click('[data-page="files"]');await click('[data-action="folder"]');assert.match(w.document.body.textContent,/report.md/);
await click('[data-action="attachFile"]');assert.match(w.document.querySelector('.chips').textContent,/report.md/);
fill('#prompt','整理本地资料');await click('[data-action="send"]');assert.match(w.document.body.textContent,/真实界面测试/);assert.equal(w.pwned,undefined);assert.equal(calls.at(-1).files[0].relative,'report.md');assert.ok(!('text' in calls.at(-1).files[0]));
await click('[data-action="saveMessage"]');await click('[data-page="library"]');assert.match(w.document.body.textContent,/整理本地资料/);
await click('[data-page="agents"]');await click('[data-action="newAgent"]');fill('[name="name"]','测试助手');fill('[name="description"]','测试角色');fill('[name="prompt"]','请按事实回答');await click('#modalSubmit');assert.equal(s.agents.at(-1).name,'测试助手');
await click('[data-page="context"]');await click('[data-action="newMemory"]');fill('[name="text"]','请用简洁中文');await click('#modalSubmit');assert.equal(s.memories[0].text,'请用简洁中文');
await click('[data-page="tasks"]');await click('[data-action="newTask"]');fill('[name="name"]','写作练习');fill('[name="prompt"]','写一段练习');await click('#modalSubmit');assert.equal(s.tasks[0].name,'写作练习');
await click('[data-page="feed"]');assert.match(w.document.body.textContent,/每一步/);
await click('[data-action="search"]');fill('#globalSearch','测试助手');assert.match(w.document.querySelector('#searchResults').textContent,/测试助手/);
w.document.querySelector('#modal').close();
await click('[data-page="tools"]');
fill('#tool-url','https://example.com');await click('[data-action="browserOpen"]');assert.equal(calls.at(-1).type,'browser');assert.match(w.document.body.textContent,/网页夹具/);
await click('[data-action="browserRead"]');assert.match(w.document.querySelector('#modal').textContent,/正文夹具/);w.document.querySelector('#modal').close();
fill('#tool-executable','node');fill('#tool-args','["--version"]');fill('#tool-folderId','folder');await click('[data-action="commandRun"]');assert.equal(calls.at(-1).type,'cli');assert.equal(JSON.stringify(calls.at(-1).args),'["--version"]');assert.match(w.document.body.textContent,/CLI fixture output/);
await click('[data-action="browserInspect"]');assert.match(w.document.querySelector('#modal').textContent,/关键词/);await click('[data-action="browserFill"]');fill('[name="browserText"]','WillBuddy');await click('#modalSubmit');assert.equal(calls.at(-1).operation,'browser_fill');assert.equal(calls.at(-1).ref,'e1');await click('[data-action="browserInspect"]');await click('[data-action="browserClick"]');assert.equal(calls.at(-1).operation,'browser_click');
console.log('PASS: 17 UI flows (mock native bridge), local attachment references, model content escaping, all 7 navigation pages');
dom.window.close();

});
