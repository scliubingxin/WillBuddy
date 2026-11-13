import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BrowserService} from '../runtime/browser.mjs';
function setup(){
 let inserts=0,verification=0,url='https://example.test/form';
 const win={isDestroyed:()=>false,getTitle:()=>'',show(){},focus(){},webContents:{getURL:()=>url,insertText:async()=>{inserts++;},executeJavaScriptInIsolatedWorld:async()=>{verification++;return true;},isLoadingMainFrame:()=>false}};
 const browser=new BrowserService({});browser.windows.set('w',win);browser.states.set('w',{epoch:5,key:'fixture',snapshot:{id:'snapshot',url,createdAt:Date.now()}});
 const request={id:'w',snapshotId:'snapshot',ref:'e1',operation:'browser_fill',epoch:5,nonce:'nonce',url,target:{label:'Search'},inputText:'private text'};browser.prepared.set(request.nonce,request);
 return {browser,request,inserts:()=>inserts,verification:()=>verification,navigate(){url='https://other.test/';browser.invalidate('w');}};
}
for(const phase of ['focus','checkFocus'])test('navigation during '+phase+' prevents approved text from reaching new page',async()=>{
 const x=setup();x.browser.dom=async(_id,_fn,p)=>{if(p.operation===phase)x.navigate();return {};};
 await assert.rejects(x.browser.perform(x.request),/快照已失效|网页发生变化/);assert.equal(x.inserts(),0);assert.equal(x.verification(),0);await assert.rejects(x.browser.perform(x.request),/凭证/);
});
test('aborting during the focus check prevents input',async()=>{
 const x=setup(),controller=new AbortController();x.browser.dom=async(_id,_fn,p)=>{if(p.operation==='checkFocus')controller.abort();return {};};
 await assert.rejects(x.browser.perform(x.request,controller.signal));assert.equal(x.inserts(),0);
});
test('unchanged page receives input and verifies it once',async()=>{
 const x=setup();x.browser.dom=async()=>({});const result=await x.browser.perform(x.request);assert.equal(result.status,'filled');assert.equal(x.inserts(),1);assert.equal(x.verification(),1);assert.equal(x.browser.states.get('w').snapshot,null);
});
