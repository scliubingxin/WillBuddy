import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {initialState} from '../../core.mjs';

test('compact production composer preserves real controls, keyboard, redraw focus and viewport-bound menus',async()=>{
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
  s.modelProfiles=[];
  const screenshots=process.env.UI_SCREENSHOT_DIR;if(screenshots){await mkdir(screenshots,{recursive:true});await page.screenshot({path:path.join(screenshots,'home.png')});}
  assert.equal(await page.locator('[data-action="attach"]').isVisible(),false);assert.equal(await page.locator('#modelChoice').isVisible(),false);
  await page.locator('[data-composer-trigger=add]').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('#agent').evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Tab');assert.equal(await page.locator('[data-composer-trigger=model]').evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'发送任务',exact:true}).evaluate(el=>el===document.activeElement),true);
  assert((await page.locator('.composer').boundingBox()).height<180);
  await page.locator('#prompt').fill('这个草稿需要保留');await page.locator('[data-composer-trigger=add]').focus();await page.keyboard.press('Enter');
  assert(await page.locator('#composerAddPanel').isVisible());assert(await page.locator('[data-action="attach"]').isVisible());
  assert.equal(await page.locator('#toolMode').isChecked(),true);await page.locator('#toolMode').uncheck();await page.locator('[data-composer-trigger=model]').click();
  assert.equal(await page.locator('#composerAddPanel').isVisible(),false);assert(await page.locator('#composerModelPanel').isVisible());
  await page.locator('#modelChoice').focus();await page.locator('#modelChoice').selectOption('auto:extreme');assert.match(await page.locator('[data-composer-trigger=model]').textContent(),/极致/);assert(await page.locator('#composerModelPanel').isVisible());
  assert.equal(await page.locator('#prompt').inputValue(),'这个草稿需要保留');assert.equal(await page.locator('#modelChoice').evaluate(el=>el===document.activeElement),true);
  if(screenshots)await page.screenshot({path:path.join(screenshots,'model-menu.png')});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#composerModelPanel').isVisible(),false);assert.equal(await page.locator('[data-composer-trigger=model]').evaluate(el=>el===document.activeElement),true);
  await page.locator('[data-composer-trigger=add]').click();assert.equal(await page.locator('#toolMode').isChecked(),false);if(screenshots)await page.screenshot({path:path.join(screenshots,'add-menu.png')});
  await page.locator('h1').click();assert.equal(await page.locator('#composerAddPanel').isVisible(),false);
  await page.locator('.recent [data-id="task"]').click();await page.locator('#prompt').fill('保持选区和菜单');
  // Keyboard/focus-driven background redraw keeps an open model menu.
  await page.locator('[data-composer-trigger=model]').click();await page.locator('#modelChoice').focus();await page.evaluate(()=>window.__runtime());await page.waitForTimeout(250);
  assert(await page.locator('#composerModelPanel').isVisible());assert.equal(await page.locator('#modelChoice').evaluate(el=>el===document.activeElement),true);assert.equal(await page.locator('#prompt').inputValue(),'保持选区和菜单');await page.keyboard.press('Escape');
  for(const width of [860,1100,1440,2048]) {await page.setViewportSize({width,height:960});for(let panel=0;panel<2;panel++) {
    if(panel)await page.locator('[data-action="panelToggle"]').click();
    const geometry=await page.locator('.composer').evaluate(el=>{const left=el.querySelector('.composer-bar-start').getBoundingClientRect(),right=el.querySelector('.composer-bar-end').getBoundingClientRect();return {height:el.getBoundingClientRect().height,overlap:left.right>right.left+1,overflow:document.documentElement.scrollWidth>innerWidth};});assert(geometry.height<180);assert.equal(geometry.overlap,false);assert.equal(geometry.overflow,false);
    if(width>=960||!panel)for(const which of ['add','model']) {await page.locator('[data-composer-trigger='+which+']').click();const box=await page.locator(which==='add'?'#composerAddPanel':'#composerModelPanel').boundingBox();assert(box.x>=11);assert(box.y>=11);assert(box.x+box.width<=width-11);assert(box.y+box.height<=949);await page.keyboard.press('Escape');}
    if(panel)await page.locator('[data-action="panelToggle"]').click();
  }}
  await page.setViewportSize({width:1440,height:960});if(screenshots)await page.screenshot({path:path.join(screenshots,'composer-fixed.png')});assert.deepEqual(await page.evaluate(()=>window.__calls),[]);
  assert.deepEqual(errors,[]);console.log('PASS: real Chromium layout/keyboard/Markdown/preview/export; native bridge and model content are fixtures');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
