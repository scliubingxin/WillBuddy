import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual Workbench import handler with simulated transport only.
const source=readFileSync('app/workbench.tsx','utf8');
const handler=source.slice(source.indexOf(' async function importChatFile('),source.indexOf(' async function importFiles('));
assert.ok(handler.includes("op:'import_chat'")&&handler.includes('JSON.parse(await file.text())'),'import handler parses a local JSON file and uses the protected server operation');
assert.ok(source.includes('accept=".json,application/json"')&&source.includes('导入安全对话'),'UI limits the picker to JSON and labels the safe import action');
const js=ts.transpileModule(handler,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
let cases=0;

async function scenario({busy=false,size=200,invalid=false,serverError=false,missing=false}={}){
 let body,opened='',error='',success='',page='',space='unchanged',agent='unchanged',mode='unchanged',refreshed=0,saving=[];
 const payload={schema:'muyun-chat-export/v1',title:'季度复盘',messages:[{role:'user',content:'问题'}]},file={size,text:async()=>invalid?'{':JSON.stringify(payload)},imported={id:'import-new',kind:'chat',name:'季度复盘（导入）',messages:payload.messages};
 const context={busy,saving:false,JSON,crypto:{randomUUID:()=> 'import-new'},setSaving:value=>saving.push(value),setSpaceId:value=>{space=value},setAgentId:value=>{agent=value},setMode:value=>{mode=value},setPage:value=>{page=value},
  api:async(path,value)=>{body=value;if(serverError)throw Error('对话 JSON 格式无效');return {id:'import-new',updated:55}},
  refresh:async()=>{refreshed++;return {records:missing?[]:[imported]}},switchChat:id=>{opened=id},toast:{success:value=>{success=value},error:value=>{error=value}}};
 vm.createContext(context);vm.runInContext(js,context);await context.importChatFile(file);
 if(busy){assert.equal(body,undefined);assert.deepEqual(saving,[]);}
 else if(size>700000){assert.equal(body,undefined);assert.match(error,/700KB/);assert.deepEqual(saving,[true,false]);}
 else if(invalid){assert.equal(body,undefined);assert.match(error,/无法解析/);assert.deepEqual(saving,[true,false]);}
 else if(serverError){assert.equal(opened,'');assert.match(error,/格式无效/);assert.deepEqual(saving,[true,false]);}
 else if(missing){assert.equal(opened,'');assert.match(error,/暂未同步/);assert.ok(refreshed>=2);}
 else{assert.equal(JSON.stringify(body),JSON.stringify({op:'import_chat',id:'import-new',data:payload}));assert.equal(opened,'import-new');assert.equal(space,'');assert.equal(agent,'');assert.equal(mode,'chat');assert.equal(page,'chat');assert.match(success,/已导入/);assert.deepEqual(saving,[true,false]);}
 cases++;
}

await scenario();await scenario({busy:true});await scenario({size:700001});await scenario({invalid:true});await scenario({serverError:true});await scenario({missing:true});
console.log(`PASS: ${cases} composer import scenarios (actual handler, simulated IO)`);
