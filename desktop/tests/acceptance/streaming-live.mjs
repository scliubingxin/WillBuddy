import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {Store} from '../../core.mjs';
import {createConversationService} from '../../services/conversation.mjs';
const packet=content=>'data: '+JSON.stringify({choices:[{index:0,delta:{content}}]})+'\n\n';

test('real Chromium + real HTTP SSE: visible early output, stable composer, GFM, safe HTML preview and original export',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'willbuddy-stream-browser-')),store=new Store(dir);await store.load();let release;
 const gate=new Promise(r=>{release=r;});const root=path.resolve(fileURLToPath(new URL('../../src/',import.meta.url)));let requests=0,page,service,browser;
 const first='# 交付计划\n\n首段已实时显示。\n\n';
 const rest='## 验收清单\n\n- **保留真实输出**\n  - 支持嵌套清单\n- [x] 流式接收\n\n| 阶段 | 结果 |\n| --- | --- |\n| 第一轮 | 已验证 |\n\n*斜体说明* 与 ~~过时内容~~\n\n<h3>HTML 正文</h3><p><strong>结构化内容</strong></p>\n\n```html\n<!doctype html><html><head><style>h1{color:rgb(0,120,203)}</style></head><body><h1>HTML 预览</h1><table><tr><td>安全表格</td></tr></table><script>parent.window.pwned=true</script><div data-action="deleteChat" onclick="alert(1)">不可注入操作</div><a href="https://example.com">外链</a></body></html>\n```';
 const server=createServer(async(req,res)=>{
  if(req.url==='/chat/completions'){requests++;let body='';for await(const chunk of req)body+=chunk;assert.equal(JSON.parse(body).stream,true);res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(packet(first));await gate;res.end(packet(rest)+'data: '+JSON.stringify({choices:[{index:0,delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');return;}
  try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error('outside root');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const address='http://127.0.0.1:'+server.address().port;store.data.settings={baseUrl:address,model:'SSE fixture',hasKey:true};const exported=[];
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const view=()=>structuredClone(store.data);const active=new Map();
  service=createConversationService({store,active,key:()=>'',view,executeTool:async()=>{throw Error('No tools in this test');},notify:()=>{page.evaluate(()=>window.__runtime?.()).catch(()=>{});},notifyStream:event=>{page.evaluate(e=>window.__stream?.(e),event).catch(()=>{});}});
  await page.exposeFunction('hostState',view);await page.exposeFunction('hostChat',p=>service.run(p));await page.exposeFunction('hostExport',p=>{exported.push(p);return true;});
  await page.addInitScript(()=>{window.actwill={state:()=>window.hostState(),chat:p=>window.hostChat(p),onRuntime:fn=>{window.__runtime=fn;},onStream:fn=>{window.__stream=fn;},exportText:p=>window.hostExport(p)};});
  await page.goto(address);try{await page.locator('#prompt').waitFor({timeout:8000});}catch(error){console.log({errors,body:await page.locator('body').innerText()});throw error;}await page.locator('#prompt').fill('给我一份排版清楚的交付计划');await page.getByRole('button',{name:'发送任务',exact:true}).click();
  await page.locator('.message-content h1').waitFor();assert.equal(await page.locator('.message-content h1').innerText(),'交付计划');assert.equal(store.data.chats[0].run.status,'running');assert.equal(store.data.chats[0].messages.at(-1).streaming,true);assert.equal(requests,1);
  await page.locator('#prompt').fill('请继续补充负责人，草稿暂不发送。');await page.locator('#prompt').focus();await page.locator('#prompt').evaluate(el=>{el.setSelectionRange(3,6);window.__composer=el;});
  const screenshots=process.env.UI_SCREENSHOT_DIR;if(screenshots){await mkdir(screenshots,{recursive:true});await page.screenshot({path:path.join(screenshots,'streaming-first.png')});}
  release();await page.locator('.message-actions').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-streaming="true"]'));
  assert.equal(await page.locator('#prompt').inputValue(),'请继续补充负责人，草稿暂不发送。');assert.equal(await page.evaluate(()=>document.activeElement.id),'prompt');assert.equal(await page.locator('#prompt').evaluate(el=>el.selectionStart),3);assert.equal(await page.evaluate(()=>window.__composer===document.querySelector('#prompt')),true);
  assert.equal(await page.locator('.message.assistant').count(),1);assert.equal(await page.locator('.message-content ul ul li').count(),1);assert.equal(await page.locator('.message-content tbody td').first().textContent(),'第一轮');assert.equal(await page.locator('.message-content h3').innerText(),'HTML 正文');assert.equal(await page.locator('.message-content em').innerText(),'斜体说明');assert.equal(await page.locator('.message-content del').innerText(),'过时内容');
  assert.equal(await page.evaluate(()=>window.pwned),undefined);assert.equal(await page.locator('.message-content [data-action]').count(),0);
  await page.getByRole('button',{name:'在工作区查看',exact:true}).click();await page.getByRole('button',{name:'HTML 预览',exact:true}).click();
  const frame=page.frameLocator('iframe.html-preview');await frame.locator('h1').waitFor();assert.equal(await frame.locator('h1').innerText(),'HTML 预览');assert.equal(await frame.locator('td').innerText(),'安全表格');assert.equal(await frame.locator('script,form,button,[onclick],[data-action],a[href]').count(),0);assert.equal(await page.locator('iframe.html-preview').getAttribute('sandbox'),'');assert.equal(await page.evaluate(()=>window.pwned),undefined);
  assert.equal(await frame.locator('body').evaluate(el=>getComputedStyle(el).fontSize),'15px');assert.equal(await frame.locator('h1').evaluate(el=>getComputedStyle(el).color),'rgb(0, 120, 203)');
  await page.getByRole('button',{name:'导出当前成果',exact:true}).click();assert.equal(exported[0].text,first+rest);
  if(screenshots)await page.screenshot({path:path.join(screenshots,'streaming-complete.png')});
  await page.setViewportSize({width:1000,height:720});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(store.data.chats[0].run.status,'completed');assert.equal(requests,1);assert.deepEqual(errors,[]);
  console.log('PASS: actual HTTP SSE -> service -> simulated native bridge -> production ESM in real Chromium; first response verified before server release; native Electron/Mac not tested');
 }finally{release();await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
