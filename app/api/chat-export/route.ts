import {db,owner,failure} from '@/lib/workspace';
import {assertEditable} from '@/lib/managed-model';
import {conversationMarkdown,exportFilename,sanitizedConversation} from '@/lib/chat-export';

export async function GET(req:Request){try{
 const user=owner(req),url=new URL(req.url),id=url.searchParams.get('id'),format=url.searchParams.get('format')||'md',rawUpdated=url.searchParams.get('baseUpdated'),baseUpdated=rawUpdated===null?NaN:Number(rawUpdated);assertEditable(id);
 if(!['md','json'].includes(format)||!Number.isSafeInteger(baseUpdated))throw new Error('导出请求无效');
 const record=await db().prepare("SELECT data,updated FROM records WHERE owner=? AND id=? AND kind='chat'").bind(user,id).first<any>();
 if(!record)throw new Error('对话不存在');if(record.updated!==baseUpdated)throw new Error('对话已在另一页面更新，请刷新后再导出');
 const data=JSON.parse(record.data),exportedAt=new Date().toISOString(),jsonFormat=format==='json',body=jsonFormat?JSON.stringify(sanitizedConversation(data,record.updated,exportedAt),null,2)+'\n':conversationMarkdown(data,record.updated,exportedAt),name=exportFilename(data.name,jsonFormat?'json':'md');
 return new Response(body,{headers:{'Content-Type':jsonFormat?'application/json; charset=utf-8':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(name)}`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return failure(e);}}
