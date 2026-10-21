import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual Workbench export handler with simulated transport only.
const source=readFileSync('app/workbench.tsx','utf8');
const handler=source.slice(source.indexOf(' async function exportChat()'),source.indexOf(' async function createTemplate'));
assert.ok(handler.includes('/api/chat-export')&&handler.includes('baseUpdated=${chatUpdated}')&&handler.includes("format=md"),'export handler requests the protected current-revision endpoint');
const js=ts.transpileModule(handler,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
let cases=0;

async function scenario({busy=false,revision=41,status=200}={}){
 let path='',downloaded=null,reloaded=0,error='',saving=[];
 const body=status===200?'# 完整对话\n':JSON.stringify({error:'对话已在另一页面更新，请刷新后再导出'}),noop=()=>{};
 const context={chatId:'chat-a',chatUpdated:revision,currentChatName:'',busy,saving:false,Number,JSON,encodeURIComponent,messages:[{role:'user',content:'季度/复盘'}],
  setSaving:value=>saving.push(value),fetch:async value=>{path=value;return {ok:status===200,status,text:async()=>body}},download:(...args)=>{downloaded=args},reloadChat:async()=>{reloaded++},toast:{success:noop,error:value=>{error=value}}};
 vm.createContext(context);vm.runInContext(js,context);await context.exportChat();
 if(busy||!Number.isSafeInteger(revision)){assert.equal(path,'');assert.equal(downloaded,null);assert.deepEqual(saving,[]);}
 else if(status===200){assert.equal(path,'/api/chat-export?id=chat-a&baseUpdated=41&format=md');assert.deepEqual(downloaded,['季度/复盘.md','# 完整对话\n','text/markdown;charset=utf-8']);assert.deepEqual(saving,[true,false]);}
 else{assert.equal(downloaded,null);assert.equal(reloaded,1);assert.match(error,/另一页面/);assert.deepEqual(saving,[true,false]);}
 cases++;
}

await scenario();await scenario({status:400});await scenario({busy:true});await scenario({revision:null});
console.log(`PASS: ${cases} composer export scenarios (actual handler, simulated IO)`);
