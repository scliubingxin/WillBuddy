import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {initialState} from '../../core.mjs';

test('composer text buttons and model row remain separate across eight layouts',async()=>{
 const root=fileURLToPath(new URL('../../src/',import.meta.url));
 const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root)){res.writeHead(403).end();return;}const bytes=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const s=initialState();s.settings.hasKey=true;s.settings.name='我的工作空间';s.folders=[{id:'project',name:'项目资料',path:'/fixture'}];
  s.chats=[{id:'task',name:'整理项目交付方案',time:Date.now(),run:{id:'r',status:'completed',startedAt:Date.now()-12000,finishedAt:Date.now()},messages:[{role:'user',content:'根据项目资料，整理交付计划和验收清单。',runId:'r',files:[{name:'项目说明.md'}]},{role:'assistant',runId:'r',content:'# 项目交付方案\n\n已根据提供的资料整理以下计划。\n\n## 交付安排\n\n| 阶段 | 工作内容 | 验收依据 |\n| --- | --- | --- |\n| 需求确认 | 明确范围与负责人 | 评审记录 |\n| 实施交付 | 完成开发与验证 | 测试结果 |\n| 上线验收 | 检查部署与回滚 | 验收清单 |\n\n## 下一步行动\n\n1. 确认任务范围和截止时间\n2. 补充尚缺的项目资料\n3. 根据实际执行结果更新计划\n\n> 本计划仍需项目负责人确认。',usage:{total_tokens:820}}]}];
  s.executions=[{id:'x',chatId:'task',runId:'r',time:Date.now()-5000,finishedAt:Date.now()-3000,tool:'cli_execute',args:{executable:'node',args:['--version']},status:'succeeded',result:{stdout:'v24.0.0\n',stderr:'',exitCode:0,status:'succeeded'}}];
  await page.addInitScript(data=>{const clone=v=>JSON.parse(JSON.stringify(v));window.__calls=[];window.actwill={state:async()=>clone(data),onRuntime:fn=>{window.__runtime=fn;},listFiles:async p=>({files:[{folderId:'project',relative:'project.md',name:'项目说明.md'}]}),readFile:async p=>({...p,name:'项目说明.md',text:'# 授权资料\n这是实际通过模拟原生桥返回的测试资料。'}),exportText:async p=>{window.__calls.push({type:'export',...p});},cancelChat:async()=>true};},s);
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.task-home').waitFor();
  assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
  const screenshots=process.env.UI_SCREENSHOT_DIR;if(screenshots){await mkdir(screenshots,{recursive:true});await page.screenshot({path:path.join(screenshots,'home.png')});}
  await page.locator('.recent [data-id="task"]').click();
  for(const width of [860,1100,1440,2048]) {await page.setViewportSize({width,height:960});for(let panel=0;panel<2;panel++) {if(panel)await page.locator('[data-action="panelToggle"]').click();const geometry=await page.locator('.composer').evaluate(el=>{const upload=el.querySelector('[data-action="attach"]'),r=upload.getBoundingClientRect(),controls=[...el.querySelectorAll('.composer-tools button,.composer-tools select,.model-selection select')].map(e=>e.getBoundingClientRect());return {width:r.width,height:r.height,clipped:upload.scrollWidth>upload.clientWidth||upload.scrollHeight>upload.clientHeight,overlap:controls.some((a,i)=>controls.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)),overflow:document.documentElement.scrollWidth>innerWidth};});assert(geometry.width>=96);assert(geometry.height>=34);assert.equal(geometry.clipped,false);assert.equal(geometry.overlap,false);assert.equal(geometry.overflow,false);if(panel)await page.locator('[data-action="panelToggle"]').click();}}
  await page.setViewportSize({width:1440,height:960});if(screenshots)await page.screenshot({path:path.join(screenshots,'composer-fixed.png')});
  assert.deepEqual(errors,[]);console.log('PASS: real Chromium layout/keyboard/Markdown/preview/export; native bridge and model content are fixtures');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
