import path from 'node:path';import {pathToFileURL} from 'node:url';
/** Dedicated bridge: each exact main frame can access only its bound Office session. */
export function createOfficeWindows({BrowserWindow,ipcMain,here,kit,chat,models,documents}){
 const windows=new Map(),byDocument=new Map(),entry=path.join(here,'src/office/index.html'),url=pathToFileURL(entry).href;
 ipcMain.handle('willbuddy-office:invoke',async(event,op,p={})=>{const binding=windows.get(event.sender.id);if(!binding||event.sender!==binding.window.webContents||event.senderFrame!==event.sender.mainFrame||event.senderFrame.url!==url)throw Error('拒绝不可信Office页面');const {session,documentId}=binding;
  if(op==='info')return {...kit.meta(session),messages:chat.history(documentId),models:models.view()};
  if(op==='snapshot')return kit.snapshot(session,p);
  if(op==='operation')return kit.operation(session,p.op,p);
  if(op==='save')return kit.save(session);
  if(op==='chat')return chat.run(session,p);
  if(op==='cancel')return chat.cancel(documentId);
  throw Error('不支持的Office接口');
 });
 return {hasUnsaved(){return [...windows.values()].some(b=>{try{return kit.meta(b.session).dirty;}catch{return false;}});},async open(id,revision){const existing=byDocument.get(id);if(existing&&!existing.isDestroyed()){existing.show();existing.focus();return {status:'opened'};}const s=await kit.open(id,revision);if(s.status==='denied')return s;const w=new BrowserWindow({width:1440,height:960,minWidth:880,minHeight:600,title:'WillBuddy Office · '+s.name,backgroundColor:'#FFFFFF',webPreferences:{preload:path.join(here,'office-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});const windowId=w.webContents.id;windows.set(windowId,{window:w,session:s.sessionId,documentId:id});byDocument.set(id,w);w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',(e,u)=>{if(u!==url)e.preventDefault();});let closing=false;w.on('close',e=>{if(closing)return;e.preventDefault();void chat.cancel(id).then(()=>kit.close(s.sessionId)).then(()=>{closing=true;w.close();}).catch(error=>{w.webContents.send('willbuddy-office:error',error.message);});});w.on('closed',()=>{windows.delete(windowId);byDocument.delete(id);});await w.loadFile(entry);return {status:'opened',id};},async close(){for(const {window} of windows.values())window.destroy();windows.clear();byDocument.clear();await kit.shutdown();}};
}
