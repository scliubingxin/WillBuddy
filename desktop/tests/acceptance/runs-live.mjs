import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {Store} from '../../core.mjs';
import {createRunQueue} from '../../runtime/run-queue.mjs';
import {createConversationService} from '../../services/conversation.mjs';
import {createTaskService} from '../../services/tasks.mjs';

test('real Chromium: queued chat survives refresh/cancel, running daily task stops actual HTTP model fixture',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'willbuddy-runs-ui-')),store=new Store(dir);await store.load();const active=new Map([['cli:busy1',new AbortController()],['cli:busy2',new AbortController()]]);let browser,page,queue,models=0,notified=0,modelClosed=false;
 store.data.tasks=[{id:'daily',name:'可停止的每日摘要',prompt:'等待模型回复',status:'ready',enabled:false}];const root=path.resolve(fileURLToPath(new URL('../../src/',import.meta.url)));
 const server=createServer(async(req,res)=>{
  if(req.url==='/chat/completions'){models++;for await(const _ of req){}res.writeHead(200,{'Content-Type':'application/json'});res.write(' ');res.on('close',()=>{modelClosed=true;});return;}
  try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw Error('outside');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const address='http://127.0.0.1:'+server.address().port;store.data.settings={baseUrl:address,model:'local HTTP fixture',hasKey:true};
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));const notify=()=>{page.evaluate(()=>window.__runtime?.()).catch(()=>{});};queue=createRunQueue({store,active,notify});const deps={store,active,queue,key:()=>'',view:()=>structuredClone(store.data),notify};const chat=createConversationService({...deps,executeTool:async()=>{throw Error('no tool should execute');}}),tasks=createTaskService({...deps,notifyCompleted:()=>{notified++;}});
  await page.exposeFunction('hostRun',async(n,p)=>{if(n==='state')return structuredClone(store.data);if(n==='chat')return chat.run(p);if(n==='cancelChat')return chat.cancel(p.id);if(n==='runTask')return tasks.run(p.id,{requestId:p.requestId});if(n==='cancelTask')return tasks.cancel(p.id);if(n==='cancelRun')return queue.cancel(p.id);throw Error('unexpected '+n);});
  await page.addInitScript(()=>{window.actwill=Object.fromEntries(['state','chat','cancelChat','runTask','cancelTask','cancelRun'].map(n=>[n,p=>window.hostRun(n,p)]));window.actwill.onRuntime=fn=>{window.__runtime=fn;};});await page.goto(address);
  await page.locator('#prompt').fill('请验证排队请求能够刷新后停止');await page.getByRole('button',{name:'发送任务',exact:true}).click();await page.locator('.run-wait').filter({hasText:'正在排队，等待执行名额'}).waitFor();assert.equal(models,0);const runId=store.data.chats[0].run.id;assert.equal(JSON.parse(await readFile(store.file,'utf8')).runJobs[0].id,runId);
  await page.reload();await page.locator('.recent [data-action="openChat"]').click();await page.getByRole('button',{name:'停止生成',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.conversation-status')?.textContent.includes('已取消'));assert.equal(models,0);assert.equal(store.data.runJobs[0].status,'cancelled');
  active.clear();await page.locator('.more-nav summary').click();await page.locator('.sidebar [data-page="tasks"]').click();await page.getByRole('button',{name:'立即运行',exact:true}).click();await page.getByRole('button',{name:'停止任务',exact:true}).waitFor();assert.equal(models,1);await page.reload();await page.locator('.more-nav summary').click();await page.locator('.sidebar [data-page="tasks"]').click();await page.getByRole('button',{name:'停止任务',exact:true}).click();await page.getByRole('button',{name:'立即运行',exact:true}).waitFor();
  assert.equal(store.data.tasks[0].status,'cancelled');assert.equal(store.data.artifacts.length,0);assert.equal(notified,0);await page.waitForFunction(()=>document.querySelector('.run-queue')?.textContent.includes('已取消'));for(let i=0;i<100&&!modelClosed;i++)await new Promise(r=>setTimeout(r,5));assert.equal(modelClosed,true);
  assert.deepEqual(errors,[]);await page.setViewportSize({width:1000,height:720});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log('PASS: production ESM + durable shared queue + actual HTTP abort, refresh retains queued/running cancellation; native bridge/model responses are fixtures, no Mac/paid-model validation');
 }finally{queue?.stop();await queue?.idle();await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
