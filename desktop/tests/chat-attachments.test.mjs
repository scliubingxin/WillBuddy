import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../core.mjs';
import {createDocumentService} from '../services/documents.mjs';
import {validateChatDocuments,readChatDocument} from '../services/chat-attachments.mjs';
import {createConversationService} from '../services/conversation.mjs';
async function fixture(format='md',spec='预算为12345元'){
 const store={data:initialState(),save:async()=>{},log:()=>{}};
 const documents=createDocumentService({store});
 const {document}=await documents.importFile('预算资料',format,Buffer.from(spec));
 const ref={documentId:document.id,revision:document.revision,sha256:document.sha256};
 return {store,ref,documents};
}
test('chat attachments verify actual bytes, reject forged metadata, duplicate, removed and changed copies',async()=>{
 const {store,ref}=await fixture();assert.equal(readChatDocument(store,ref).text,'预算为12345元');
 assert.equal(validateChatDocuments(store,[{...ref,name:'forged'}])[0].name,'预算资料.md');
 assert.throws(()=>validateChatDocuments(store,[ref,ref]),/无效/);
 assert.throws(()=>validateChatDocuments(store,[{...ref,revision:0}]),/变化/);
 store.data.documents[0].base64=Buffer.from('tampered').toString('base64');assert.throws(()=>readChatDocument(store,ref),/校验/);
 store.data.documents=[];assert.throws(()=>readChatDocument(store,ref),/移除/);
});
test('chat attachment collection has explicit count and total text limits',async()=>{
 const {store,ref,documents}=await fixture('md','a'.repeat(60000));
 const {document}=await documents.importFile('second','md',Buffer.from('b'.repeat(60000)));
 assert.throws(()=>validateChatDocuments(store,[ref,{documentId:document.id,revision:document.revision,sha256:document.sha256}]),/10万/);
 assert.throws(()=>validateChatDocuments(store,Array(33).fill(ref)),/最多/);
});
test('plain conversation sends explicitly attached body without tool mode and does not resend on next question',async()=>{
 const {store,ref}=await fixture(), requests=[];
 const c=createConversationService({store,active:new Map(),key:()=>'',view:()=>store.data,executeTool:async()=>{throw Error('no tool');},request:async(settings,key,m)=>{requests.push(m);return {role:'assistant',content:'预算为12345元（HTTP语义夹具）'};}});
 await c.run({id:'chat1',prompt:'预算是多少？',documents:[ref],toolsEnabled:false});
 assert.match(JSON.stringify(requests[0]),/预算为12345元/);
 assert.equal(store.data.chats[0].messages[0].documents[0].sha256,ref.sha256);
 assert.equal(store.data.chats[0].messages[0].content,'预算是多少？');
 await c.run({id:'chat1',prompt:'第二轮',toolsEnabled:false});
 assert.ok(!requests[1].at(-1).content.includes('预算为12345元'));
});
test('queued document deletion or target model change blocks model invocation',async()=>{
 for(const change of ['delete','model']){
 const {store,ref}=await fixture();let worker,calls=0;
 const queue={lookup:()=>null,hasOwner:()=>false,submit:async(job,fn,on)=>{worker=fn;on({...job,status:'queued',revision:1});}};
 const c=createConversationService({store,queue,active:new Map(),key:()=>'',view:()=>store.data,executeTool:()=>{},request:async()=>{calls++;}});
 await c.run({id:'c',prompt:'问答',documents:[ref]});
 if(change==='delete')store.data.documents=[];else store.data.settings.model='changed';
 await assert.rejects(worker(new AbortController()),/变化|移除/);assert.equal(calls,0);
 }
});
test('real DOCX XLSX PPTX bytes yield actual body text for attachment questions',async()=>{
 const {generateDocument}=await import('../runtime/documents.mjs');
 for(const [format,spec] of Object.entries({docx:{title:'预算',blocks:[{type:'paragraph',text:'文档预算13579'}]},xlsx:{sheets:[{name:'预算表',rows:[['金额',13579]]}]},pptx:{slides:[{title:'预算13579',bullets:['实际幻灯片文字'],notes:'合成备注'}]}})){
  const store={data:initialState(),save:async()=>{},log:()=>{}},service=createDocumentService({store});
  const generated=await generateDocument(format,JSON.stringify(spec));
  const {document:d}=await service.importFile('attachment',format,generated.bytes);
  const output=readChatDocument(store,{documentId:d.id,revision:d.revision,sha256:d.sha256});
  assert.match(output.text,/13579/);assert.equal(output.truncated,false);
 }
});

test('empty extracted attachment fails instead of claiming image/OCR understanding',async()=>{const {store,ref}=await fixture('md','   ');assert.throws(()=>readChatDocument(store,ref),/未提取/);});
