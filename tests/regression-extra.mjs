// Runs against the same real SQLite database and bundled production routes as integration.mjs.
// All external services are simulated. These checks are not production login or model evaluations.
export async function regression({check,modules,workspace,documents,chat,req,call,save,sqlite,db}){
 const read=id=>JSON.parse(sqlite.prepare('SELECT state FROM jobs WHERE owner=? AND id=?').get('user-a',id).state);
 const record=id=>JSON.parse(sqlite.prepare('SELECT data FROM records WHERE owner=? AND id=?').get('user-a',id).data);
 const remove=(id,user='user-a',baseUpdated=sqlite.prepare("SELECT updated FROM records WHERE owner=? AND id=? AND kind='chat'").get(user,id)?.updated)=>workspace.DELETE(new Request('https://work.example.com/api/workspace?id='+id+(Number.isSafeInteger(baseUpdated)?'&baseUpdated='+baseUpdated:''),{method:'DELETE',headers:{'oai-authenticated-user-id':user}}));
 const create=async(resource='auto-a')=>(await call('jobs',{op:'create',resource,input:'yes',profileId:'profile-a'})).data.id;
 let d;

 // Every exported route/method enforces application identity, not only the home API.
 for(const [name,module] of Object.entries({workspace,documents,chat,...Object.fromEntries(['chatExport','artifactFile','documentTool','data','vault','versions','appData','integrations','research','jobs'].map(n=>[n,modules[n]]))})){
  for(const method of ['GET','POST','DELETE'])if(module[method]){
   const r=await module[method](new Request('https://work.example.com/api/'+name,{method,...method==='POST'?{body:'{}'}:{}}));
   check(r.status===401,`${name}.${method}: missing identity rejected`);
  }
 }
 console.log('PASS category: authentication across all 13 API routes');

 // Persist, reopen, edit, isolate and delete every general workspace record kind.
 const kinds=['space','agent','flow','chat','artifact','profile','run','connector','research','app','automation','dashboard','memory','preferences','folder','topic','story'];
 for(const kind of kinds){
  const id='crud-'+kind;
  const data={name:'幕云AI 回归 '+kind,content:'初始',prompt:'按事实回答',nodes:[{id:'start',type:'input'}],type:'search',baseUrl:'https://models.example.com',model:'test-model'};
  check((await save(id,kind,data)).status===200,`${kind}: create`);
  const updated=kind==='chat'?await workspace.POST(req('/api/workspace',{id,kind,data:{...data,name:'已修改 '+kind},baseUpdated:sqlite.prepare('SELECT updated FROM records WHERE owner=? AND id=?').get('user-a',id).updated})):await save(id,kind,{...data,name:'已修改 '+kind});
  check(updated.status===200,`${kind}: update`);
  const own=(await(await workspace.GET(req('/api/workspace'))).json()).records;
  check(own.some(r=>r.id===id&&r.name==='已修改 '+kind),`${kind}: reopen saved changes`);
  await remove(id,'user-b');check(record(id).name==='已修改 '+kind,`${kind}: foreign delete has no effect`);
  await remove(id);check(!sqlite.prepare('SELECT id FROM records WHERE owner=? AND id=?').get('user-a',id),`${kind}: delete`);
 }
 console.log('PASS category: workspace records (17 kinds, create/edit/reopen/isolation/delete)');

 const concurrencyId='chat-concurrency';
 let response=await workspace.POST(req('/api/workspace',{id:concurrencyId,kind:'chat',data:{name:'并发对话',messages:[{role:'user',content:'第一版'}]}}));
 const first=await response.json();check(response.status===200&&Number.isSafeInteger(first.updated),'chat create returns its server revision');
 response=await workspace.POST(req('/api/workspace',{id:concurrencyId,kind:'chat',baseUpdated:first.updated,data:{name:'并发对话',messages:[{role:'user',content:'第二页新增'}]}}));
 const second=await response.json();check(response.status===200&&second.updated>first.updated,'current chat revision advances monotonically');
 response=await workspace.POST(req('/api/workspace',{id:concurrencyId,kind:'chat',baseUpdated:first.updated,data:{name:'旧页面',messages:[{role:'user',content:'旧快照'}]}}));
 check(response.status===400&&(await response.json()).error.includes('另一页面'),'stale chat revision is rejected before overwriting');
 response=await workspace.POST(req('/api/workspace',{id:concurrencyId,kind:'chat',data:{name:'旧客户端',messages:[]}}));
 check(response.status===400&&(await response.json()).error.includes('刷新'),'existing chat update without a revision fails closed');
 check(record(concurrencyId).messages[0].content==='第二页新增','rejected saves preserve the newest durable chat');
 response=await remove(concurrencyId,'user-a',first.updated);check(response.status===400&&(await response.json()).error.includes('另一页面'),'stale chat revision cannot delete a newer conversation');
 check(record(concurrencyId).messages[0].content==='第二页新增','rejected stale deletion preserves the newest durable chat');
 check(!sqlite.prepare('SELECT id FROM deleted_chats WHERE owner=? AND id=?').get('user-a',concurrencyId),'stale deletion creates no recoverable snapshot');
 response=await remove(concurrencyId,'user-a',null);check(response.status===400&&(await response.json()).error.includes('刷新'),'existing chat deletion without a revision fails closed');
 await remove(concurrencyId,'user-a',second.updated);check(!sqlite.prepare('SELECT id FROM records WHERE owner=? AND id=?').get('user-a',concurrencyId),'current chat revision can delete the conversation');
 const tombstone=sqlite.prepare('SELECT data,deleted,expires FROM deleted_chats WHERE owner=? AND id=?').get('user-a',concurrencyId);
 check(JSON.parse(tombstone.data).messages[0].content==='第二页新增'&&tombstone.expires-tombstone.deleted===7*24*60*60*1000,'successful deletion snapshots the exact current chat for seven days');
 const deletedWorkspace=await(await workspace.GET(req('/api/workspace'))).json();check(deletedWorkspace.deletedChats.some(item=>item.id===concurrencyId&&item.deleted===tombstone.deleted)&&!deletedWorkspace.records.some(item=>item.id===concurrencyId),'workspace separates recoverable chats from active records');
 response=await workspace.POST(req('/api/workspace',{op:'restore_chat',id:concurrencyId,deleted:tombstone.deleted},'user-b'));check(response.status===400,'another user cannot restore a deleted chat');
 response=await workspace.POST(req('/api/workspace',{op:'restore_chat',id:concurrencyId,deleted:tombstone.deleted+1}));check(response.status===400,'forged deletion token cannot restore a chat');
 response=await workspace.POST(req('/api/workspace',{op:'restore_chat',id:concurrencyId,deleted:tombstone.deleted}));const restored=await response.json();check(response.status===200&&Number.isSafeInteger(restored.updated)&&record(concurrencyId).messages[0].content==='第二页新增','owner restores the exact deleted conversation as a new revision');
 response=await workspace.POST(req('/api/workspace',{op:'restore_chat',id:concurrencyId,deleted:tombstone.deleted}));check(response.status===400,'a deletion snapshot can be restored only once');
 await remove(concurrencyId,'user-a',restored.updated);const expired=sqlite.prepare('SELECT deleted FROM deleted_chats WHERE owner=? AND id=?').get('user-a',concurrencyId);sqlite.prepare('UPDATE deleted_chats SET expires=? WHERE owner=? AND id=?').run(Date.now()-1,'user-a',concurrencyId);
 response=await workspace.POST(req('/api/workspace',{op:'restore_chat',id:concurrencyId,deleted:expired.deleted}));check(response.status===400&&(await response.json()).error.includes('超过 7 天')&&!sqlite.prepare('SELECT id FROM deleted_chats WHERE owner=? AND id=?').get('user-a',concurrencyId),'expired chat cannot be restored and its tombstone is removed');

 const branchSource='chat-branch-source',branchTarget='chat-branch-target';
 response=await workspace.POST(req('/api/workspace',{id:branchSource,kind:'chat',data:{name:'采购方案',spaceId:'space-a',messages:[{role:'user',content:'比较两个方案'},{role:'assistant',content:'初步结论',proposals:[{id:'proposal-pending'}],artifacts:[{id:'artifact-existing'}],events:[{type:'tool_approved',receipt:{proposalId:'proposal-completed'}}]}]}}));const branchRevision=(await response.json()).updated;
 sqlite.prepare("INSERT INTO records(owner,id,kind,data,updated) VALUES(?,?,?,?,?)").run('user-a','proposal-pending','tool_request',JSON.stringify({chatId:branchSource,status:'pending'}),Date.now());
 sqlite.prepare("INSERT INTO chat_requests(owner,id,chat,digest,status,response,updated) VALUES(?,?,?,?,?,?,?)").run('user-a','request-old',branchSource,'digest','completed','{}',Date.now());
 response=await workspace.POST(req('/api/workspace',{op:'branch_chat',id:branchSource,newId:branchTarget,baseUpdated:branchRevision-1}));check(response.status===400&&!sqlite.prepare('SELECT id FROM records WHERE owner=? AND id=?').get('user-a',branchTarget),'stale chat revision cannot create a branch');
 response=await workspace.POST(req('/api/workspace',{op:'branch_chat',id:branchSource,newId:branchTarget,baseUpdated:branchRevision},'user-b'));check(response.status===400,'another user cannot branch a conversation');
 response=await workspace.POST(req('/api/workspace',{op:'branch_chat',id:branchSource,newId:branchTarget,baseUpdated:branchRevision}));const branchResult=await response.json(),branchData=record(branchTarget);
 check(response.status===200&&branchResult.id===branchTarget&&branchData.name==='采购方案 分支','current owner creates a separately named branch');
 check(branchData.messages[1].content==='初步结论'&&!('proposals' in branchData.messages[1])&&branchData.messages[1].artifacts[0].id==='artifact-existing','branch preserves completed context and artifacts but strips executable proposals');
 check(record(branchSource).messages[1].proposals[0].id==='proposal-pending','branching does not mutate the source conversation');
 check(!sqlite.prepare("SELECT id FROM records WHERE owner=? AND kind='tool_request' AND json_extract(data,'$.chatId')=?").get('user-a',branchTarget)&&!sqlite.prepare('SELECT id FROM chat_requests WHERE owner=? AND chat=?').get('user-a',branchTarget),'branch copies neither tool authority nor model replay records');
 response=await workspace.POST(req('/api/workspace',{op:'branch_chat',id:branchSource,newId:branchTarget,baseUpdated:branchRevision}));check(response.status===400&&record(branchTarget).messages[1].content==='初步结论','existing target ID is never overwritten by branching');
 await remove(branchTarget);await remove(branchSource);

 const renameId='chat-rename-source',renameOriginal={name:'旧任务名称',spaceId:'space-a',agentId:'agent-a',mode:'research',messages:[{role:'user',content:'保留原始问题'},{role:'assistant',content:'保留原始回答',proposals:[{id:'proposal-rename'}]}],customEvidence:{approved:true}};
 response=await workspace.POST(req('/api/workspace',{id:renameId,kind:'chat',data:renameOriginal}));const renameRevision=(await response.json()).updated;
 sqlite.prepare("INSERT INTO records(owner,id,kind,data,updated) VALUES(?,?,?,?,?)").run('user-a','proposal-rename','tool_request',JSON.stringify({chatId:renameId,status:'pending'}),Date.now());
 sqlite.prepare("INSERT INTO chat_requests(owner,id,chat,digest,status,response,updated) VALUES(?,?,?,?,?,?,?)").run('user-a','request-rename',renameId,'digest','completed','{}',Date.now());
 response=await workspace.POST(req('/api/workspace',{op:'rename_chat',id:renameId,name:'旧页面误改',baseUpdated:renameRevision-1}));check(response.status===400&&record(renameId).name==='旧任务名称','stale chat revision cannot rename a newer conversation');
 response=await workspace.POST(req('/api/workspace',{op:'rename_chat',id:renameId,name:'无版本名称'}));check(response.status===400&&record(renameId).name==='旧任务名称','chat rename without a revision fails closed');
 response=await workspace.POST(req('/api/workspace',{op:'rename_chat',id:renameId,name:'   ',baseUpdated:renameRevision}));check(response.status===400&&record(renameId).name==='旧任务名称','blank chat name is rejected');
 response=await workspace.POST(req('/api/workspace',{op:'rename_chat',id:renameId,name:'跨用户名称',baseUpdated:renameRevision},'user-b'));check(response.status===400&&record(renameId).name==='旧任务名称','another user cannot rename the conversation');
 response=await workspace.POST(req('/api/workspace',{op:'rename_chat',id:renameId,name:'  第三季度采购复盘  ',baseUpdated:renameRevision}));const renameResult=await response.json(),renamedData=record(renameId);
 check(response.status===200&&renameResult.name==='第三季度采购复盘'&&renameResult.updated>renameRevision&&renamedData.name==='第三季度采购复盘','current owner renames the conversation and receives a newer revision');
 check(JSON.stringify({...renamedData,name:renameOriginal.name})===JSON.stringify(renameOriginal),'rename changes only the name and preserves all conversation evidence byte-for-byte');
 check(sqlite.prepare("SELECT id FROM records WHERE owner=? AND kind='tool_request' AND json_extract(data,'$.chatId')=?").get('user-a',renameId)?.id==='proposal-rename'&&sqlite.prepare('SELECT id FROM chat_requests WHERE owner=? AND chat=?').get('user-a',renameId)?.id==='request-rename','rename preserves tool authority and model replay records without duplicating them');
 response=await workspace.POST(req('/api/workspace',{op:'rename_chat',id:renameId,name:'再次误改',baseUpdated:renameRevision}));check(response.status===400&&record(renameId).name==='第三季度采购复盘','consumed rename revision cannot overwrite the accepted name');
 await remove(renameId,'user-a',renameResult.updated);

 const exportId='chat-export-source',exportSha='a'.repeat(64),exportData={name:'采购/复盘：一季度',messages:[{role:'user',content:'请复盘采购方案',requestId:'private-request-id'},{role:'assistant',content:'结论正文',model:'fixture-model',usage:{input:12,output:34},proposals:[{id:'pending-secret',args:{token:'never-export'}}],sources:[{number:1,name:'采购规范',url:'https://docs.example.com/rule',excerpt:'审批阈值说明'},{number:2,name:'危险链接',url:'javascript:alert(1)',content:'不安全协议'}],artifacts:[{id:'artifact-internal',name:'采购结论.xlsx',size:321,sha256:exportSha,url:'/api/artifact-file?id=private',objectKey:'user-a/private.xlsx'}],events:[{toolArgs:{token:'hidden'}}]}]};
 response=await workspace.POST(req('/api/workspace',{id:exportId,kind:'chat',data:exportData}));const exportRevision=(await response.json()).updated;
 let exported=await modules.chatExport.GET(req(`/api/chat-export?id=${exportId}&baseUpdated=${exportRevision}&format=md`,null));const markdown=await exported.text();
 check(exported.status===200&&exported.headers.get('content-type').startsWith('text/markdown')&&exported.headers.get('cache-control')==='no-store'&&exported.headers.get('x-content-type-options')==='nosniff','current owner downloads a no-store Markdown conversation export');
 check(exported.headers.get('content-disposition').includes(encodeURIComponent('采购_复盘：一季度.md'))&&markdown.includes('请复盘采购方案')&&markdown.includes('结论正文')&&markdown.includes('采购规范')&&markdown.includes(exportSha),'conversation export has a safe Chinese filename and preserves readable evidence');
 check(!['private-request-id','pending-secret','never-export','artifact-internal','private.xlsx','javascript:','toolArgs'].some(secret=>markdown.includes(secret)),'Markdown export excludes executable proposals, request IDs, internal artifact fields and unsafe links');
 exported=await modules.chatExport.GET(req(`/api/chat-export?id=${exportId}&baseUpdated=${exportRevision}&format=json`,null));const exportJson=await exported.json(),serialized=JSON.stringify(exportJson);
 check(exported.status===200&&exportJson.schema==='muyun-chat-export/v1'&&exportJson.sourceRevision===exportRevision&&exportJson.messages[1].artifacts[0].sha256===exportSha&&!['private-request-id','pending-secret','objectKey','toolArgs'].some(secret=>serialized.includes(secret)),'JSON export is versioned, sanitized and retains completed artifact evidence');
 check((await modules.chatExport.GET(req(`/api/chat-export?id=${exportId}&baseUpdated=${exportRevision-1}&format=md`,null))).status===400,'stale conversation revision cannot be exported');
 check((await modules.chatExport.GET(req(`/api/chat-export?id=${exportId}&format=md`,null))).status===400,'missing conversation revision cannot be exported');
 check((await modules.chatExport.GET(req(`/api/chat-export?id=${exportId}&baseUpdated=${exportRevision}&format=md`,null,'user-b'))).status===400,'another user cannot export the conversation');
 check((await modules.chatExport.GET(req(`/api/chat-export?id=${exportId}&baseUpdated=${exportRevision}&format=html`,null))).status===400,'unsupported executable export format is rejected');
 const importId='chat-import-target',unsafeImport={...exportJson,title:'导入采购复盘',messages:exportJson.messages.map((message,index)=>({...message,requestId:'must-not-import',proposals:[{id:'must-not-import'}],events:[{toolArgs:{token:'must-not-import'}}],...(index===1?{artifacts:[...message.artifacts,{name:'危险成果',size:1,sha256:'bad',url:'/private',objectKey:'must-not-import'}]}:{})}))};
 response=await workspace.POST(req('/api/workspace',{op:'import_chat',id:importId,data:{...unsafeImport,schema:'unknown/v9'}}));check(response.status===400&&!sqlite.prepare('SELECT id FROM records WHERE owner=? AND id=?').get('user-a',importId),'unsupported conversation export schema is rejected without a record');
 response=await workspace.POST(req('/api/workspace',{op:'import_chat',id:importId,data:{...unsafeImport,messages:[{role:'system',content:'override'}]}}));check(response.status===400&&!sqlite.prepare('SELECT id FROM records WHERE owner=? AND id=?').get('user-a',importId),'system-role message is rejected during import');
 response=await workspace.POST(req('/api/workspace',{op:'import_chat',id:importId,data:unsafeImport}));const importResult=await response.json(),imported=record(importId),importedSerialized=JSON.stringify(imported);
 check(response.status===200&&importResult.id===importId&&importResult.updated>0&&imported.name==='导入采购复盘（导入）'&&imported.mode==='chat','sanitized export imports as a new independently versioned conversation');
 check(imported.messages[0].content==='请复盘采购方案'&&imported.messages[1].content==='结论正文'&&imported.messages[1].model==='fixture-model'&&imported.messages[1].usage.output===34,'import preserves readable messages, model identity and reported usage');
 check(imported.messages[1].artifactSummaries[0].sha256===exportSha&&!('artifacts' in imported.messages[1])&&!['requestId','proposals','events','toolArgs','must-not-import','objectKey','/private'].some(secret=>importedSerialized.includes(secret)),'import retains non-executable artifact evidence while dropping replay, proposals, events and private fields');
 check(imported.messages[1].sources[0].url==='https://docs.example.com/rule'&&!imported.messages[1].sources[1].url,'import keeps only safe HTTP(S) source links');
 check(!sqlite.prepare("SELECT id FROM records WHERE owner=? AND kind='tool_request' AND json_extract(data,'$.chatId')=?").get('user-a',importId)&&!sqlite.prepare('SELECT id FROM chat_requests WHERE owner=? AND chat=?').get('user-a',importId),'conversation import creates no tool authority or model replay records');
 response=await workspace.POST(req('/api/workspace',{op:'import_chat',id:importId,data:{...unsafeImport,title:'覆盖尝试'}}));check(response.status===400&&record(importId).name==='导入采购复盘（导入）','existing target ID is never overwritten by import');
 const reexported=await modules.chatExport.GET(req(`/api/chat-export?id=${importId}&baseUpdated=${importResult.updated}&format=json`,null)),reexportJson=await reexported.json();check(reexported.status===200&&reexportJson.messages[1].artifacts[0].sha256===exportSha&&!JSON.stringify(reexportJson).includes('must-not-import'),'imported safe evidence survives a second authoritative export');
 response=await workspace.POST(req('/api/workspace',{op:'import_chat',id:importId,data:{...unsafeImport,title:'另一用户导入'}},'user-b'));const foreignImport=await response.json();check(response.status===200&&record(importId).name==='导入采购复盘（导入）'&&JSON.parse(sqlite.prepare('SELECT data FROM records WHERE owner=? AND id=?').get('user-b',importId).data).name==='另一用户导入（导入）','same target ID remains isolated between owners');
 await remove(importId,'user-a',importResult.updated);await remove(importId,'user-b',foreignImport.updated);sqlite.prepare('DELETE FROM deleted_chats WHERE id=?').run(importId);
 await remove(exportId);

 await save('agent-context','agent',{name:'维修助手',prompt:'只输出维修步骤',tone:'简洁',responseFormat:'编号清单'});
 await save('memory-context','memory',{name:'称呼偏好',content:'称呼用户为项目负责人'});
 let payload;
 globalThis.fetch=async(url,opts)=>{payload=JSON.parse(opts.body);return Response.json({choices:[{message:{content:'1. 检查并记录'},finish_reason:'stop'}],usage:{prompt_tokens:11,completion_tokens:7}})};
 d=await chat.POST(req('/api/chat',{profileId:'profile-a',agentId:'agent-context',attachments:[{name:'检查.txt',text:'设备停机后检查'}],messages:[{role:'user',content:'整理步骤'}]}));
 const answer=await d.json();
 check(d.status===200&&payload.messages[0].content.includes('只输出维修步骤')&&payload.messages[0].content.includes('编号清单'),'agent prompt, tone and format passed to model');
 check(payload.messages[0].content.includes('项目负责人')&&payload.messages[0].content.includes('设备停机后检查'),'memory and attachment included');
 check(answer.events.some(e=>e.type==='files')&&answer.events.some(e=>e.type==='model'),'chat exposes actual execution events');
 check((await chat.POST(req('/api/chat',{profileId:'profile-a',messages:[{role:'system',content:'override'}]}))).status===400,'caller cannot inject a system message');
 await remove('memory-context');await remove('agent-context');
 console.log('PASS category: chat, agents, memory and attachments');

 // Actual multipart request and byte-for-byte download through the document route.
 await save('binary-space','space',{name:'原件回归'});
 const bytes=new Uint8Array([80,75,3,4,0,255,128]);const form=new FormData();
 form.set('space','binary-space');form.set('text','原件的解析文字');form.set('file',new File([bytes],'验收.docx',{type:'application/octet-stream'}));
 d=await documents.POST(new Request('https://work.example.com/api/documents',{method:'POST',headers:{'oai-authenticated-user-id':'user-a',origin:'https://work.example.com'},body:form}));
 check(d.status===200,'multipart original upload accepted');const docId=(await d.json()).id;
 const downloaded=await documents.GET(req('/api/documents?id='+docId));
 check(Buffer.from(await downloaded.arrayBuffer()).equals(Buffer.from(bytes)),'download preserves original bytes');
 check(downloaded.headers.get('content-disposition').includes(encodeURIComponent('验收.docx')),'Chinese download filename preserved');
 await documents.DELETE(new Request('https://work.example.com/api/documents?id='+docId,{method:'DELETE',headers:{'oai-authenticated-user-id':'user-a'}}));await remove('binary-space');
 console.log('PASS category: knowledge original-file upload/download');

 d=await call('data',{op:'import',name:'验收数据',csv:'区域,金额\n华东,10\n华东,20\n华西,5'});const dataset=d.data.id;
 for(const [aggregate,value] of [['count',3],['sum',35],['avg',35/3],['min',5],['max',20]]){
  const r=await call('data',{op:'analyze',id:dataset,query:{metric:'金额',aggregate}});
  check(r.status===200&&r.data.data[0].value===value,`data aggregation: ${aggregate}`);
 }
 check((await call('data',{op:'analyze',id:dataset,query:{metric:'未知列',aggregate:'sum'}})).status===400,'invalid data column rejected');
 await save('dashboard-regression','dashboard',{name:'金额看板',datasetId:dataset,query:{metric:'金额',aggregate:'sum'}});
 check((await call('versions',{id:'dashboard-regression',op:'publish'})).data.version===1,'dashboard publishes a real query snapshot');
 const loaded=await modules.data.GET(req('/api/data?id='+dataset));check((await loaded.json()).rows.length===3,'dataset can be reopened');
 await remove(dataset);check((await modules.data.GET(req('/api/data?id='+dataset))).status===400,'deleted dataset unavailable');await remove('dashboard-regression');
 console.log('PASS category: all five aggregations, dataset lifecycle and dashboard version');

 globalThis.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify({questions:['维修'],queries:['维修规范'],sections:['结论']})},finish_reason:'stop'}]});
 d=await call('research',{op:'plan',goal:'维修计划',profileId:'profile-a'});const research=d.data.id;
 check(d.status===200&&record(research).status==='planned','research plan persists');
 check((await call('research',{op:'write',id:research,profileId:'profile-a'})).status===400,'research cannot write without evidence');
 globalThis.fetch=async()=>new Response('unavailable',{status:503});
 check((await call('research',{op:'gather',id:research,urls:['https://evidence.example.com/fail']})).status===400,'no usable research evidence is an explicit failure');
 await remove(research);
 await call('appData',{app:'app-a',op:'delete',key:'items'});
 check((await call('appData',{app:'app-a',op:'get',key:'items'})).data.value===null,'app stored value deletion');
 check((await modules.versions.GET(req('/api/versions?id=app-a',null,'user-b'))).status===400,'foreign version history denied');
 console.log('PASS category: research failures, app storage deletion and version isolation');

 // Every cancellation boundary, including repeated requests and unknown side effects.
 const ready=await create();d=await call('jobs',{op:'cancel',id:ready});
 check(d.data.status==='cancelled'&&d.data.pending===null&&d.data.timeline.at(-1).status==='cancelled','ready job cancels with persisted event');
 d=await call('jobs',{op:'cancel',id:ready});check(d.status===200&&d.data.timeline.length===1,'repeat cancellation is idempotent');
 check((await call('jobs',{op:'step',id:ready})).data.status==='cancelled','cancelled job cannot resume');
 check((await call('jobs',{op:'approve',id:ready})).status===400,'cancelled approval cannot run');
 check((await call('jobs',{op:'cancel',id:ready},'user-b')).status===400,'foreign cancellation denied');
 check((await call('jobs',{op:'cancel',id:'uncertain'})).status===400&&read('uncertain').status==='executing_action','unknown external result cannot be relabelled cancelled');
 const terminal=await create();sqlite.prepare('UPDATE jobs SET state=json_set(state,\'$.status\',?) WHERE id=?').run('failed',terminal);
 check((await call('jobs',{op:'cancel',id:terminal})).status===400&&read(terminal).status==='failed','failed job stays failed');
 sqlite.prepare('UPDATE jobs SET state=json_set(state,\'$.status\',?) WHERE id=?').run('succeeded',terminal);
 check((await call('jobs',{op:'cancel',id:terminal})).status===400&&read(terminal).status==='succeeded','successful job stays successful');
 const locked=await create();sqlite.prepare('UPDATE jobs SET lease=? WHERE id=?').run(Date.now()+60000,locked);
 check((await call('jobs',{op:'cancel',id:locked})).status===400&&read(locked).status==='ready','active step cannot be falsely cancelled');
 let external=0;globalThis.fetch=async()=>{external++;return Response.json({ok:true})};
 const waiting=await create('auto-action');await call('jobs',{op:'step',id:waiting});await call('jobs',{op:'cancel',id:waiting});
 check(read(waiting).status==='cancelled'&&read(waiting).pending===null&&external===0,'waiting action cancels without outbound side effect');
 check((await call('jobs',{op:'approve',id:waiting})).status===400&&external===0,'stale confirm cannot execute cancelled action');
 const rejected=await create('auto-action');await call('jobs',{op:'step',id:rejected});await call('jobs',{op:'reject',id:rejected});
 check(read(rejected).pending===null&&read(rejected).timeline.at(-1).status==='rejected'&&external===0,'job rejection clears pending and records reason');

 // Concurrent approve/cancel must have one winner and never lose its final status.
 const raceJob=await create('auto-action');await call('jobs',{op:'step',id:raceJob});
 const race=await Promise.all([call('jobs',{op:'approve',id:raceJob}),call('jobs',{op:'cancel',id:raceJob})]);
 check(race.filter(r=>r.status===200).length===1,'approve/cancel race has one winner');
 check(read(raceJob).status===(external===1?'ready':'cancelled')&&external<=1,'race status matches the actual simulated side effect');

 // An expired model step returns after cancellation: old revision must not win.
 await save('slow-auto','automation',{name:'慢步骤回归',nodes:[{id:'slow',type:'ai',prompt:'整理输入'}]});await call('versions',{id:'slow-auto',op:'publish'});
 const stale=await create('slow-auto');let release,started;
 const entered=new Promise(resolve=>{started=resolve});const pending=new Promise(resolve=>{release=resolve});
 globalThis.fetch=async()=>{started();return pending;};
 const step=call('jobs',{op:'step',id:stale});await entered;
 // Controlled lease-expiry simulation, not a four-minute wall-clock test.
 sqlite.prepare('UPDATE jobs SET lease=0 WHERE id=?').run(stale);await call('jobs',{op:'cancel',id:stale});
 release(Response.json({choices:[{message:{content:'late response'},finish_reason:'stop'}]}));
 check((await step).status===400&&read(stale).status==='cancelled','late model response cannot overwrite cancellation');
 check(!sqlite.prepare('SELECT id FROM records WHERE id=?').get('job-result-'+stale),'stale completion cannot create an artifact');

 // The completion checkpoint and result artifact share a real SQLite transaction.
 await save('atomic-auto','automation',{name:'原子成果',nodes:[{id:'result',type:'output',prompt:'可复核成果'}]});await call('versions',{id:'atomic-auto',op:'publish'});
 const atomic=await create('atomic-auto');const originalBatch=db.batch;
 db.batch=async stmts=>{sqlite.exec('BEGIN');try{await stmts[0].run();throw new Error('injected transaction failure');}finally{sqlite.exec('ROLLBACK');}};
 try{check((await call('jobs',{op:'step',id:atomic})).status===400,'transaction failure reported');}finally{db.batch=originalBatch;}
 check(read(atomic).status==='ready'&&!sqlite.prepare('SELECT id FROM records WHERE id=?').get('job-result-'+atomic),'failed transaction publishes neither success nor artifact');
 sqlite.prepare('UPDATE jobs SET lease=0 WHERE id=?').run(atomic);
 d=await call('jobs',{op:'step',id:atomic});check(d.data.status==='succeeded'&&record('job-result-'+atomic).content==='可复核成果','recovered transaction commits both success and artifact');
 const listed=(await(await modules.jobs.GET(req('/api/jobs'))).json()).jobs;
 check(listed.find(j=>j.id===ready).timeline.at(-1).status==='cancelled','separate job-list request restores cancellation history');
 console.log('PASS category: cancellation, approval races, stale writes and atomic artifacts');

 const connector=record('connector-a');await save('connector-other','connector',{...connector,name:'Other'});
 external=0;globalThis.fetch=async()=>{external++;return Response.json({ok:true})};
 const stage=async()=>(await call('integrations',{op:'stage',id:'connector-a',action:'create',args:{body:{name:'reviewed'}}})).data.approvalId;
 const a=await stage();check((await call('integrations',{op:'reject',id:'connector-other',approvalId:a})).status===400&&record(a).status==='pending','wrong connector cannot reject approval');
 const decisions=await Promise.all([call('integrations',{op:'execute',id:'connector-a',approvalId:a}),call('integrations',{op:'reject',id:'connector-a',approvalId:a})]);
 check(decisions.filter(r=>r.status===200).length===1,'connector execute/reject has one winner');
 check(external<=1&&record(a).status===(external?'completed':'rejected'),'connector race preserves executed/rejected outcome');
 const b=await stage();await call('integrations',{op:'reject',id:'connector-a',approvalId:b});const prior=external;
 check((await call('integrations',{op:'execute',id:'connector-a',approvalId:b})).status===400&&external===prior,'rejected approval can never execute');
 check((await call('integrations',{op:'reject',id:'connector-a',approvalId:b})).status===400,'repeat rejection does not rewrite event');
 console.log('PASS category: connector rejection isolation and races');
}
