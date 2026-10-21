import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {Store} from '../../core.mjs';
import {ToolRuntime} from '../../runtime/tools.mjs';
import {createCommandService} from '../../services/commands.mjs';

test('real Chromium and Node CLI: queue persists, refresh retains stop, retry needs a fresh approval',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'willbuddy-command-ui-')),store=new Store(dir);await store.load();store.data.folders=[{id:'f',name:'验收项目',path:dir}];
 const root=path.resolve(fileURLToPath(new URL('../../src/',import.meta.url)));let browser,page,approvals=0,service;
 const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const notify=()=>{page.evaluate(()=>window.__runtime?.()).catch(()=>{});};
  const runtime=new ToolRuntime({store,approve:async()=>{approvals++;return true;},notify});
  service=createCommandService({store,active:new Map(),executeTool:(...args)=>runtime.execute(...args),notify});
  await page.exposeFunction('hostCommand',async(method,p)=>{
   if(method==='state')return structuredClone(store.data);
   if(method==='enqueueCommand')return service.enqueue(p);
   if(method==='cancelCommand')return service.cancel(p.id);
   if(method==='retryCommand')return service.retry(p);
   if(method==='forgetCommand')return service.forget(p.id);
   throw Error('unexpected '+method);
  });
  await page.addInitScript(()=>{window.actwill=Object.fromEntries(['state','enqueueCommand','cancelCommand','retryCommand','forgetCommand'].map(n=>[n,p=>window.hostCommand(n,p)]));window.actwill.onRuntime=fn=>{window.__runtime=fn;};});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.getByRole('button',{name:'工具台 ↗',exact:true}).click();
  await page.locator('#tool-executable').fill(process.execPath);await page.locator('#tool-args').fill(JSON.stringify(['-e','console.log("LIVE CLI OUTPUT");setInterval(()=>{},50)']));await page.locator('#tool-folderId').selectOption('f');await page.getByRole('button',{name:'审阅并执行',exact:true}).click();
  const current=page.locator('.command-job').first();await current.locator('.terminal').filter({hasText:'LIVE CLI OUTPUT'}).waitFor();assert.equal(approvals,1);
  const id=await current.getAttribute('data-job-id');const persisted=JSON.parse(await readFile(store.file,'utf8'));assert.equal(persisted.commandJobs[0].id,id);assert.equal(persisted.commandJobs[0].status,'running');
  await page.reload();await page.getByRole('button',{name:'工具台 ↗',exact:true}).click();assert.equal(await current.getAttribute('data-job-id'),id);await current.getByRole('button',{name:'停止命令',exact:true}).click();await current.locator('[role="status"]').filter({hasText:'已取消'}).waitFor();assert.equal(approvals,1);
  await current.getByRole('button',{name:'重新审阅并重试',exact:true}).click();await page.locator('.command-job').first().locator('.terminal').filter({hasText:'LIVE CLI OUTPUT'}).waitFor();assert.equal(approvals,2);assert.equal(store.data.commandJobs.length,2);assert.equal(store.data.commandJobs[0].retryOf,id);
  await page.locator('.command-job').first().getByRole('button',{name:'停止命令',exact:true}).click();await page.locator('.command-job').first().locator('[role="status"]').filter({hasText:'已取消'}).waitFor();
  await page.setViewportSize({width:1000,height:720});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const screenshots=process.env.UI_SCREENSHOT_DIR;if(screenshots){await mkdir(screenshots,{recursive:true});await page.locator('.command-queue').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(screenshots,'command-queue.png'),fullPage:true});}
  assert.deepEqual(errors,[]);console.log('PASS: real production ESM -> simulated native IPC -> durable service -> actual Node child; refresh/stop/retry; native approvals are fixtures, not Mac validation');
 }finally{service?.stop();await service?.idle();await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
