import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual Workbench rename handlers with simulated transport only.
const source=readFileSync('app/workbench.tsx','utf8');
const start=source.indexOf(' function openRenameChat()'),end=source.indexOf(' async function exportChat()');
const handler=source.slice(start,end);
assert.ok(handler.includes("op:'rename_chat'")&&handler.includes('baseUpdated:chatUpdated'),'rename handler uses the protected current-revision operation');
assert.ok(source.includes("currentChatName||messages[0]?.content.slice(0,54)"),'conversation heading prefers the durable saved name');
const js=ts.transpileModule(handler,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
let cases=0;

async function scenario({conflict=false,missing=false,busy=false,revision=27}={}){
 let body,dialog='',reloaded=0,refreshed=0,error='',success='',serverRevision=null,form={name:'  第三季度采购复盘  '};
 const renamed={id:'chat-source',kind:'chat',name:'第三季度采购复盘',messages:[{role:'user',content:'问题'}]};
 const context={records:[{id:'chat-source',kind:'chat',name:'旧名称'}],messages:renamed.messages,chatId:'chat-source',chatUpdated:revision,busy,saving:false,form,Number,
  setForm:value=>{form=value},setDialog:value=>{dialog=value},setSaving(){},setChatUpdated:value=>{serverRevision=value},
  api:async(path,value)=>{body=value;if(conflict)throw Error('对话已在另一页面更新，请刷新后重命名');return {name:'第三季度采购复盘',updated:31}},
  refresh:async()=>{refreshed++;return {records:missing?[]:[renamed]}},reloadChat:async()=>{reloaded++},toast:{success:value=>{success=value},error:value=>{error=value}}};
 vm.createContext(context);vm.runInContext(js,context);
 context.openRenameChat();
 if(busy){assert.equal(dialog,'');assert.equal(body,undefined);cases++;return;}
 assert.equal(dialog,'rename-chat');assert.equal(form.name,'旧名称');form={name:'  第三季度采购复盘  '};context.form=form;
 await context.renameChat();
 if(!Number.isSafeInteger(revision)){assert.equal(body,undefined);assert.equal(dialog,'rename-chat');}
 else if(conflict){assert.equal(reloaded,1);assert.equal(dialog,'rename-chat');assert.match(error,/另一页面/);}
 else if(missing){assert.equal(dialog,'rename-chat');assert.match(error,/暂未同步/);assert.ok(refreshed>=2);}
 else{assert.equal(JSON.stringify(body),JSON.stringify({op:'rename_chat',id:'chat-source',name:'  第三季度采购复盘  ',baseUpdated:27}));assert.equal(dialog,'');assert.equal(serverRevision,31);assert.match(success,/已更新/);}
 cases++;
}

await scenario();await scenario({conflict:true});await scenario({missing:true});await scenario({busy:true});await scenario({revision:null});
console.log(`PASS: ${cases} composer rename scenarios (actual handlers, simulated IO)`);
