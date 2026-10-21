import {body,db,owner,guard,json,failure,saveRecord,saveChatRecord} from '@/lib/workspace';
import {managedModel,assertEditable} from '@/lib/managed-model';
import {modelEndpoint} from '@/lib/model';
import {importedConversation} from '@/lib/chat-export';
export async function GET(req:Request){try{const user=owner(req);const [records,docs,usage,vault,deleted]=await Promise.all([
 db().prepare("SELECT id,kind,data,updated FROM records WHERE owner=? AND kind!='tool_request' ORDER BY updated DESC").bind(user).all(),
 db().prepare('SELECT id,space,name,size,created FROM documents WHERE owner=? ORDER BY created DESC').bind(user).all(),
 db().prepare('SELECT model,input,output,elapsed,created FROM usage WHERE owner=? ORDER BY created DESC LIMIT 200').bind(user).all(),
 db().prepare('SELECT id FROM vault WHERE owner=?').bind(user).all(),
 db().prepare('SELECT id,data,deleted,expires FROM deleted_chats WHERE owner=? AND expires>? ORDER BY deleted DESC LIMIT 20').bind(user,Date.now()).all(),
 ]);const managed=managedModel();return json({vault:[...vault.results.map((v:any)=>v.id),...(managed?[managed.id]:[])],records:[...(managed?[managed]:[]),...records.results.map((r:any)=>({...JSON.parse(r.data),id:r.id,kind:r.kind,updated:r.updated}))],deletedChats:deleted.results.map((r:any)=>({id:r.id,name:JSON.parse(r.data).name||'未命名对话',deleted:r.deleted,expires:r.expires})),documents:docs.results,usage:usage.results});}catch(e){return failure(e);}}
export async function POST(req:Request){try{guard(req);const user=owner(req);const payload=await body(req),{id,kind,data,baseUpdated,op,deleted,newId,name}=payload;assertEditable(id);
 if(op==='restore_chat'){
  if(typeof id!=='string'||id.length>100||!Number.isSafeInteger(deleted))throw new Error('恢复请求无效');
  const tombstone=await db().prepare('SELECT deleted,expires FROM deleted_chats WHERE owner=? AND id=?').bind(user,id).first<any>();if(!tombstone||tombstone.deleted!==deleted)throw new Error('已删除对话不存在或已恢复');
  if(tombstone.expires<=Date.now()){await db().prepare('DELETE FROM deleted_chats WHERE owner=? AND id=? AND deleted=?').bind(user,id,deleted).run();throw new Error('该对话已超过 7 天恢复期限');}
  const updated=Math.max(Date.now(),deleted+1),results=await db().batch([
   db().prepare("INSERT INTO records(owner,id,kind,data,updated) SELECT d.owner,d.id,'chat',d.data,? FROM deleted_chats d WHERE d.owner=? AND d.id=? AND d.deleted=? AND d.expires>? AND NOT EXISTS (SELECT 1 FROM records r WHERE r.owner=d.owner AND r.id=d.id)").bind(updated,user,id,deleted,Date.now()),
   db().prepare("DELETE FROM deleted_chats WHERE owner=? AND id=? AND deleted=? AND EXISTS (SELECT 1 FROM records r WHERE r.owner=deleted_chats.owner AND r.id=deleted_chats.id AND r.kind='chat' AND r.updated=?)").bind(user,id,deleted,updated),
  ]);if(results[0].meta.changes!==1||results[1].meta.changes!==1)throw new Error('同名对话已存在，未覆盖当前内容');return json({ok:true,updated});
 }
 if(op==='branch_chat'){
  assertEditable(newId);if(typeof id!=='string'||id.length>100||typeof newId!=='string'||newId.length>100||newId===id||!Number.isSafeInteger(baseUpdated))throw new Error('分支请求无效');
  const source=await db().prepare("SELECT data,updated FROM records WHERE owner=? AND id=? AND kind='chat'").bind(user,id).first<any>();if(!source||source.updated!==baseUpdated)throw new Error('对话已在另一页面更新，请刷新后创建分支');
  const sourceData=JSON.parse(source.data),messages=Array.isArray(sourceData.messages)?sourceData.messages.map((message:any)=>{if(!message||typeof message!=='object')return message;const {proposals,...safe}=message;return safe;}):[];
  const branched={...sourceData,name:`${String(sourceData.name||'对话').slice(0,190)} 分支`,messages};if(JSON.stringify(branched).length>350000)throw new Error('对话过大，无法创建分支');
  const updated=Math.max(Date.now(),source.updated+1),created=await db().prepare("INSERT INTO records(owner,id,kind,data,updated) SELECT owner,?,'chat',?,? FROM records WHERE owner=? AND id=? AND kind='chat' AND updated=? AND NOT EXISTS (SELECT 1 FROM records WHERE owner=? AND id=?)").bind(newId,JSON.stringify(branched),updated,user,id,source.updated,user,newId).run();
  if(created.meta.changes!==1)throw new Error('对话已变化或目标已存在，未创建分支');return json({ok:true,id:newId,updated});
 }
 if(op==='rename_chat'){
  if(typeof id!=='string'||id.length>100||!Number.isSafeInteger(baseUpdated)||typeof name!=='string'||!name.trim()||name.length>200)throw new Error('重命名请求无效，名称不能为空且最多 200 字');
  const source=await db().prepare("SELECT data,updated FROM records WHERE owner=? AND id=? AND kind='chat'").bind(user,id).first<any>();if(!source)throw new Error('对话不存在');if(source.updated!==baseUpdated)throw new Error('对话已在另一页面更新，请刷新后重命名');
  const renamed=name.trim(),sourceData=JSON.parse(source.data),nextData={...sourceData,name:renamed};if(JSON.stringify(nextData).length>350000)throw new Error('对话过大，无法重命名');
  const updated=Math.max(Date.now(),source.updated+1),changed=await db().prepare("UPDATE records SET data=?,updated=? WHERE owner=? AND id=? AND kind='chat' AND updated=?").bind(JSON.stringify(nextData),updated,user,id,source.updated).run();
  if(changed.meta.changes!==1)throw new Error('对话已在另一页面更新，请刷新后重命名');return json({ok:true,name:renamed,updated});
 }
 if(op==='import_chat'){
  if(typeof id!=='string'||id.length>100)throw new Error('导入请求无效');const imported=importedConversation(data),updated=Date.now();
  const created=await db().prepare("INSERT INTO records(owner,id,kind,data,updated) SELECT ?,?,'chat',?,? WHERE NOT EXISTS (SELECT 1 FROM records WHERE owner=? AND id=?)").bind(user,id,JSON.stringify(imported),updated,user,id).run();
  if(created.meta.changes!==1)throw new Error('目标对话已存在，未覆盖任何内容');return json({ok:true,id,name:imported.name,updated});
 }
 if(typeof id!=='string'||id.length>100||!['space','agent','flow','chat','artifact','profile','run','connector','research','app','automation','dashboard','memory','preferences','folder','topic','story'].includes(kind)||!data||typeof data!=='object')throw new Error('记录格式无效');
 if(typeof data.name!=='string'||!data.name.trim()||data.name.length>200)throw new Error('名称不能为空，最多 200 字');
 if(kind==='connector'){if(!['mcp','openapi','search'].includes(data.type))throw new Error('连接器类型无效');if(data.type!=='search')modelEndpoint(data.baseUrl);if(data.actions&&!Array.isArray(data.actions))throw new Error('操作列表无效');delete data.apiKey;delete data.key;}
 if(kind==='automation'){const {validateNodes}=await import('@/lib/job-engine');validateNodes(data.nodes);}
 if(kind==='chat'){const updated=await saveChatRecord(user,id,data,baseUpdated);return json({ok:true,updated});}
 if(kind==='profile'){modelEndpoint(data.baseUrl);if(!data.model?.trim())throw new Error('模型名称不能为空');await saveRecord(user,id,kind,{name:data.name,baseUrl:data.baseUrl,model:data.model,maxTokens:Math.min(16384,Math.max(256,Number(data.maxTokens)||4096))});}
 else {if(JSON.stringify(data).length>350000)throw new Error('记录过大，请拆分后保存');await saveRecord(user,id,kind,data);}
 return json({ok:true});}catch(e){return failure(e);}}
export async function DELETE(req:Request){try{guard(req);const user=owner(req),url=new URL(req.url),id=url.searchParams.get('id');assertEditable(id);const docs=await db().prepare('SELECT id FROM documents WHERE owner=? AND space=?').bind(user,id).all();if(docs.results.length)throw new Error('请先删除空间内的文件');const record=await db().prepare('SELECT kind,data,updated FROM records WHERE owner=? AND id=?').bind(user,id).first<any>();
 if(record?.kind==='chat'){
  const raw=url.searchParams.get('baseUpdated'),baseUpdated=raw===null?NaN:Number(raw);if(!Number.isSafeInteger(baseUpdated)||baseUpdated!==record.updated)throw new Error('对话已在另一页面更新，请刷新后再删除');
  const deletedAt=Date.now(),expires=deletedAt+7*24*60*60*1000,removed=await db().batch([
   db().prepare("INSERT INTO deleted_chats(owner,id,data,deleted,expires) SELECT owner,id,data,?,? FROM records WHERE owner=? AND id=? AND kind='chat' AND updated=? ON CONFLICT(owner,id) DO UPDATE SET data=excluded.data,deleted=excluded.deleted,expires=excluded.expires").bind(deletedAt,expires,user,id,baseUpdated),
   db().prepare("DELETE FROM records WHERE owner=? AND id=? AND kind='chat' AND updated=?").bind(user,id,baseUpdated),
  ]);if(removed[0].meta.changes!==1||removed[1].meta.changes!==1)throw new Error('对话已在另一页面更新，请刷新后再删除');
  await db().batch([db().prepare("DELETE FROM records WHERE owner=? AND kind='tool_request' AND json_extract(data,'$.chatId')=? AND json_extract(data,'$.status') IN ('pending','executing')").bind(user,id),db().prepare('DELETE FROM chat_requests WHERE owner=? AND chat=?').bind(user,id),db().prepare('DELETE FROM vault WHERE owner=? AND id=?').bind(user,id),db().prepare('DELETE FROM app_values WHERE owner=? AND app=?').bind(user,id),db().prepare('DELETE FROM versions WHERE owner=? AND resource=?').bind(user,id)]);return json({ok:true});
 }
 if(record?.kind==='dataset'||record?.kind==='artifact'&&JSON.parse(record.data).objectKey===`${user}/chat-artifacts/${id}.xlsx`){const {bucket}=await import('@/lib/workspace');await bucket().delete(JSON.parse(record.data).objectKey);}
 await db().batch([db().prepare('DELETE FROM records WHERE owner=? AND id=?').bind(user,id),db().prepare('DELETE FROM vault WHERE owner=? AND id=?').bind(user,id),db().prepare('DELETE FROM app_values WHERE owner=? AND app=?').bind(user,id),db().prepare('DELETE FROM versions WHERE owner=? AND resource=?').bind(user,id)]);return json({ok:true});}catch(e){return failure(e);}}
