import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';import {tmpdir} from 'node:os';import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {Store} from '../../core.mjs';import {ToolRuntime} from '../../runtime/tools.mjs';
import {documentViews} from '../../services/documents.mjs';
import {resolveDocumentSelection} from '../../services/document-selection.mjs';
import {selectionPatches} from '../../runtime/word-selection.mjs';
import {createConversationService} from '../../services/conversation.mjs';
import {wordFixture} from '../helpers/word-fixture.mjs';import {openPackage,sha256} from '../../runtime/documents.mjs';
test('production Word preview: select actual text/table, attach to chat, scoped HTTP model patch, original parts and reload',{timeout:60000},async()=>{
 const root=fileURLToPath(new URL('../../src/',import.meta.url)),dir=await mkdtemp(path.join(tmpdir(),'wb-selection-')),store=new Store(dir);await store.load();
 const input=await wordFixture(),runtime=new ToolRuntime({store,approve:async()=>true});const original=(await runtime.documents.importFile('品牌原件','docx',input)).document;
 const view=()=>structuredClone({...store.data,documents:documentViews(store.data)});let requests=[],selected;
 const server=createServer(async(req,res)=>{
  if(req.url==='/chat/completions'){
   let raw='';for await(const b of req)raw+=b;const body=JSON.parse(raw);requests.push(body);
   const out=requests.length===1?{role:'assistant',content:null,tool_calls:[{id:'selected-patch',type:'function',function:{name:'document_patch',arguments:JSON.stringify({id:original.id,expectedRevision:selected.revision,patches:selectionPatches(selected,'终稿')})}}]}:{role:'assistant',content:'已按选区修改，原文件结构保留。'};
   res.setHeader('content-type','application/json');res.end(JSON.stringify({choices:[{message:out}]}));return;
  }
  try{const pathname=new URL(req.url,'http://local').pathname;const f=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!f.startsWith(root))throw Error();res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(f)]||'application/octet-stream');res.end(await readFile(f));}catch{res.writeHead(404).end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;store.data.settings={baseUrl:base,model:'fixture'};
 const conversation=createConversationService({store,active:new Map(),key:()=>'',view,approve:async()=>true,executeTool:(...a)=>runtime.execute(...a)});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.exposeFunction('host',async(n,p)=>{
   if(n==='state')return view();if(n==='documentPreview')return runtime.documents.preview(p.id,p.revision);
   if(n==='documentSelection'){selected=resolveDocumentSelection(store,p);return selected;}
   if(n==='documentSelectionReplace'){const s=resolveDocumentSelection(store,p);return runtime.documents.updateEditor(s.documentId,s.revision,{patches:selectionPatches(s,p.replacement)},async()=>true);}
   if(n==='chat')return conversation.run(p);throw Error('unexpected '+n);
  });await page.addInitScript(()=>{window.actwill=Object.fromEntries(['state','documentPreview','documentSelection','documentSelectionReplace','chat'].map(n=>[n,p=>window.host(n,p)]));});
  await page.goto(base);await page.locator('[data-page="library"]').click();await page.getByRole('button',{name:'预览',exact:true}).click();
  const frame=page.frameLocator('iframe.office-frame');await frame.locator('article p').filter({hasText:'季度草案'}).waitFor();
  await frame.locator('article p').filter({hasText:'季度草案'}).evaluate(p=>{const texts=[];const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);while(w.nextNode())texts.push(w.currentNode);const r=document.createRange();r.setStart(texts[1],0);r.setEnd(texts[1],2);getSelection().removeAllRanges();getSelection().addRange(r);p.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
  await frame.getByRole('button',{name:'附加选区到对话',exact:true}).click();await page.getByRole('button',{name:'移除选区',exact:true}).waitFor();
  assert.equal(selected.text,'草案');await page.locator('#prompt').fill('将选中的草案改成终稿，保持原格式');await page.getByRole('button',{name:'发送任务',exact:true}).click();
  await page.getByText('已按选区修改，原文件结构保留。',{exact:true}).waitFor();assert.equal(requests.length,2);assert.match(JSON.stringify(requests[0].messages),/用户明确附加的Word选区/);assert.equal(runtime.documents.read(original.id).revision,2);assert.match(runtime.documents.read(original.id).text,/季度\s+终稿/);
  const out=runtime.documents.bytes(original.id,2).bytes,a=openPackage(input),z=openPackage(out);for(const n of Object.keys(a))if(n!=='word/document.xml')assert.equal(sha256(a[n]),sha256(z[n]),n);
  const restored=new Store(dir);await restored.load();assert.equal(restored.data.chats[0].messages[0].selections[0].text,'草案');
  await page.locator('[data-page="library"]').click();await page.getByRole('button',{name:'预览',exact:true}).click();
  await frame.locator('article table').first().waitFor();await frame.locator('article table td').first().click();await frame.getByRole('button',{name:'附加选区到对话',exact:true}).click();await page.getByRole('button',{name:'移除选区',exact:true}).waitFor();assert.equal(selected.kind,'table');assert.equal(selected.rows,1);
  await page.getByRole('button',{name:'移除选区',exact:true}).click();
  await page.locator('[data-page="library"]').click();await page.getByRole('button',{name:'预览',exact:true}).click();
  await frame.locator('article p').filter({hasText:'季度终稿'}).waitFor();
  await frame.locator('article p').filter({hasText:'季度终稿'}).evaluate(p=>{const text=p.querySelectorAll('span')[1]?.firstChild||p.firstChild;const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);const ts=[];while(w.nextNode())ts.push(w.currentNode);const r=document.createRange();r.selectNodeContents(ts[1]);getSelection().removeAllRanges();getSelection().addRange(r);p.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
  await frame.getByRole('button',{name:'编辑选中文字',exact:true}).click();await page.locator('[name="replacement"]').fill('定稿');await page.getByRole('button',{name:'保存Word新版本',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#modal').open);assert.equal(runtime.documents.read(original.id).revision,3);assert.match(runtime.documents.read(original.id).text,/定稿/);
  assert.deepEqual(errors,[]);await page.screenshot({path:path.join(dir,'selected-context.png')});console.log('Word selected text → source validation → HTTP tool patch → final reply; table selection and disk reload passed');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
