import {test} from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import http from 'node:http';import os from 'node:os';import path from 'node:path';import {mkdtemp,rm} from 'node:fs/promises';
import {chromium} from 'playwright-core';import {BrowserService} from '../../runtime/browser.mjs';import {ToolRuntime} from '../../runtime/tools.mjs';import {Store} from '../../core.mjs';import {runAgent} from '../../runtime/agent.mjs';
const html=`<!doctype html><html><head><title>Browser tool acceptance fixture</title></head><body>
<form action="/result"><label>关键词<input id="q" name="q" placeholder="关键词" oninput="window.inputTrusted=event.isTrusted"></label><button id="go">搜索</button></form>
<button id="count" onclick="window.clickTrusted=event.isTrusted;this.dataset.count=String(Number(this.dataset.count||0)+1)">增加计数</button>
<input type="password" value="not-for-model"><input type="file"><input aria-label="验证码" autocomplete="one-time-code">
</body></html>`;

test('real Chromium: inspect, trusted fill/click, form navigation, denial, stale target, occlusion, token replay, redaction and agent loop',async()=>{
 if(!process.env.CHROME_PATH&&!process.env.CHROME_CDP_URL)throw new Error('Set CHROME_PATH to a local Chrome executable; the test does not download a browser.');
 const server=http.createServer((req,res)=>{res.setHeader('content-type','text/html;charset=utf-8');const u=new URL(req.url,'http://fixture');res.end(u.pathname==='/result'?`<!doctype html><title>Search result</title><h1>查询结果</h1><p>${(u.searchParams.get('q')||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</p>`:html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`,dir=await mkdtemp(path.join(os.tmpdir(),'willbuddy-browser-live-'));
 let chrome;
 try{
  chrome=process.env.CHROME_CDP_URL?await chromium.connectOverCDP(process.env.CHROME_CDP_URL):await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,chromiumSandbox:process.env.CHROME_TEST_NO_SANDBOX!=='1',args:process.env.CHROME_TEST_NO_SANDBOX==='1'?['--no-sandbox']:[]});
  const context=await chrome.newContext();const windows=[];
  class Window extends EventEmitter{
   constructor(options){super();assert.equal(options.webPreferences.sandbox,true);assert.equal(options.webPreferences.nodeIntegration,false);assert.equal(options.webPreferences.preload,undefined);this.destroyed=false;this.url='';this.webContents=new EventEmitter();this.ready=context.newPage().then(async page=>{this.page=page;this.cdp=await context.newCDPSession(page);await this.cdp.send('Page.enable');this.cdp.on('Page.frameNavigated',e=>{if(!e.frame.parentId){this.url=e.frame.url;this.webContents.emit('did-navigate');}});page.on('framenavigated',frame=>{if(frame===page.mainFrame())this.url=frame.url();});return page;});
    Object.assign(this.webContents,{session:{setPermissionRequestHandler(){},setPermissionCheckHandler(){},on(){}},setWindowOpenHandler(){},getURL:()=>this.url,isLoadingMainFrame:()=>false,
      executeJavaScript:async code=>(await this.ready).evaluate(code),
      executeJavaScriptInIsolatedWorld:async(worldId,scripts)=>{await this.ready;const {frameTree}=await this.cdp.send('Page.getFrameTree');const {executionContextId}=await this.cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'willbuddy-test-'+worldId});const response=await this.cdp.send('Runtime.evaluate',{expression:scripts[0].code,contextId:executionContextId,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;},
      sendInputEvent:async event=>{await this.cdp.send('Input.dispatchMouseEvent',{type:event.type==='mouseDown'?'mousePressed':'mouseReleased',x:event.x,y:event.y,button:'left',clickCount:1});},
      insertText:async text=>{await this.cdp.send('Input.insertText',{text});}
    });windows.push(this);
   }
   async loadURL(value){const page=await this.ready;this.webContents.emit('did-start-navigation');await page.goto(value);this.url=page.url();}
   isDestroyed(){return this.destroyed;}getTitle(){return 'Acceptance fixture';}show(){}focus(){}close(){this.destroyed=true;this.emit('closed');this.page?.close().catch(()=>{});}
  }
  const browser=new BrowserService({BrowserWindow:Window,shell:{openExternal:async()=>{throw new Error('not used');}}}),store=new Store(dir);await store.load();
  const runtime=new ToolRuntime({store,browser,approve:async()=>true});const opened=await browser.open(url),id=opened.id,w=windows[0];
  let snapshot=await runtime.execute('browser_snapshot',{id}),query=snapshot.elements.find(e=>e.label==='关键词');assert.ok(query);assert.ok(!JSON.stringify(snapshot).includes('not-for-model'));
  let output=await runtime.execute('browser_fill',{id,snapshotId:snapshot.snapshotId,ref:query.ref,text:'WillBuddy 中文'});assert.equal(output.status,'filled');assert.equal(await w.page.evaluate(()=>inputTrusted),true);assert.equal(await w.page.locator('#q').inputValue(),'WillBuddy 中文');assert.ok(!JSON.stringify(store.data.executions[0]).includes('WillBuddy 中文'));
  assert.equal((await runtime.execute('browser_fill',{id,snapshotId:snapshot.snapshotId,ref:query.ref,text:'replay'})).status,'failed');
  snapshot=await runtime.execute('browser_snapshot',{id});let submit=snapshot.elements.find(e=>e.label==='搜索');output=await runtime.execute('browser_click',{id,snapshotId:snapshot.snapshotId,ref:submit.ref});assert.equal(output.status,'clicked');await w.page.waitForURL('**/result?**');assert.match(await w.page.locator('body').innerText(),/WillBuddy 中文/);
  await w.loadURL(url);snapshot=await browser.snapshot(id);let counter=snapshot.elements.find(e=>e.label==='增加计数');runtime.approve=async()=>false;output=await runtime.execute('browser_click',{id,snapshotId:snapshot.snapshotId,ref:counter.ref});assert.equal(output.status,'denied');assert.equal(await w.page.locator('#count').getAttribute('data-count'),null);
  runtime.approve=async()=>{await w.page.locator('#count').evaluate(el=>el.textContent='页面已改变');return true;};output=await runtime.execute('browser_click',{id,snapshotId:snapshot.snapshotId,ref:counter.ref});assert.equal(output.status,'failed');assert.equal(await w.page.locator('#count').getAttribute('data-count'),null);
  await w.loadURL(url);snapshot=await browser.snapshot(id);counter=snapshot.elements.find(e=>e.label==='增加计数');runtime.approve=async()=>true;await w.page.evaluate(()=>{const overlay=document.createElement('div');overlay.style='position:fixed;inset:0;z-index:999;background:white';document.body.append(overlay);});output=await runtime.execute('browser_click',{id,snapshotId:snapshot.snapshotId,ref:counter.ref});assert.equal(output.status,'failed');assert.match(output.error,/遮挡/);
  await w.loadURL(url);snapshot=await browser.snapshot(id);counter=snapshot.elements.find(e=>e.label==='增加计数');const approved=await browser.prepareAction('browser_click',{id,snapshotId:snapshot.snapshotId,ref:counter.ref});await browser.perform(approved);assert.equal(await w.page.evaluate(()=>clickTrusted),true);assert.equal(await w.page.locator('#count').getAttribute('data-count'),'1');await assert.rejects(browser.perform(approved),/凭证/);
  // Five actual tool calls driven by a deterministic model protocol fixture.
  await w.loadURL(url);let step=0,lastSnapshot;const agentResult=await runAgent({messages:[{role:'user',content:'填写并搜索'}],request:async history=>{const last=history.at(-1);if(last?.role==='tool'){const output=JSON.parse(last.content);if(output.snapshotId)lastSnapshot=output;}let call;
    if(step===0)call=['browser_snapshot',{id}];
    if(step===1)call=['browser_fill',{id,snapshotId:lastSnapshot.snapshotId,ref:lastSnapshot.elements.find(e=>e.label==='关键词').ref,text:'Agent search'}];
    if(step===2)call=['browser_snapshot',{id}];
    if(step===3)call=['browser_click',{id,snapshotId:lastSnapshot.snapshotId,ref:lastSnapshot.elements.find(e=>e.label==='搜索').ref}];
    if(step===4)call=['browser_read',{id}];
    if(!call){assert.match(last.content,/Agent search/);return {text:'已根据实际搜索结果完成'};}step++;return {message:{role:'assistant',content:null,tool_calls:[{id:'step_'+step,type:'function',function:{name:call[0],arguments:JSON.stringify(call[1])}}]}};
  },execute:(name,args,signal)=>runtime.execute(name,args,signal,{chatId:'acceptance'})});assert.match(agentResult.text,/实际搜索结果/);assert.equal(agentResult.events.length,5);assert.ok(agentResult.events.every(e=>e.status!=='failed'));
  browser.closeAll();console.log('PASS: real Chromium trusted input + isolated-world DOM; approvals use deterministic fixtures, not native macOS dialogs or a paid model.');
 }finally{await chrome?.close();server.close();await rm(dir,{recursive:true,force:true});}
});
