import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual Workbench branch handler with simulated transport only.
const source=readFileSync('app/workbench.tsx','utf8');
const handler=source.slice(source.indexOf(' async function branchChat()'),source.indexOf(' async function createTemplate'));
assert.ok(handler.includes("op:'branch_chat'")&&handler.includes('newId:crypto.randomUUID()'),'branch handler uses the protected server operation and a fresh target ID');
const js=ts.transpileModule(handler,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
let cases=0;

async function scenario({conflict=false,missing=false}={}){
 let body,opened='',reloaded=0,refreshed=0,error='',space='',agent='',mode='';
 const branched={id:'branch-new',kind:'chat',name:'采购方案 分支',messages:[{role:'user',content:'问题'}],spaceId:'space-a',agentId:'agent-a',mode:'research'};
 const context={chatId:'chat-source',chatUpdated:27,busy:false,saving:false,Number,crypto:{randomUUID:()=> 'branch-new'},setSaving(){},setSpaceId:v=>{space=v},setAgentId:v=>{agent=v},setMode:v=>{mode=v},
  api:async(path,value)=>{body=value;if(conflict)throw Error('对话已在另一页面更新，请刷新后创建分支');return {id:'branch-new',updated:31}},
  refresh:async()=>{refreshed++;return {records:missing?[]:[branched]}},reloadChat:async()=>{reloaded++},switchChat:id=>{opened=id},toast:{success(){},error:value=>{error=value}}};
 vm.createContext(context);vm.runInContext(js,context);await context.branchChat();
 if(conflict){assert.equal(reloaded,1);assert.equal(opened,'');assert.match(error,/另一页面/);}
 else if(missing){assert.equal(opened,'');assert.match(error,/暂未同步/);assert.ok(refreshed>=2);}
 else{assert.equal(JSON.stringify(body),JSON.stringify({op:'branch_chat',id:'chat-source',newId:'branch-new',baseUpdated:27}));assert.equal(opened,'branch-new');assert.equal(space,'space-a');assert.equal(agent,'agent-a');assert.equal(mode,'research');}
 cases++;
}

await scenario();await scenario({conflict:true});await scenario({missing:true});
console.log(`PASS: ${cases} composer branch scenarios (actual handler, simulated IO)`);
