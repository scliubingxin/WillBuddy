import { env } from 'cloudflare:workers';
import {managedModel,MANAGED_MODEL_ID,assertEditable} from './managed-model';
export function db(){if(!env.DB)throw new Error('数据服务暂不可用，请稍后重试');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('文件服务暂不可用');return env.BUCKET;}
export function owner(req:Request){const id=req.headers.get('oai-authenticated-user-id');if(!id)throw new Error('请登录后使用工作台');return id;}
export function guard(req:Request){owner(req);const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new Error('请求来源无效');}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function failure(e:unknown){const message=e instanceof Error?e.message:'操作失败，请重试';return json({error:message},message.includes('登录')?401:400);}
export async function body(req:Request,max=700000){const data=await req.text();if(data.length>max)throw new Error('内容过大，请拆分后提交');return JSON.parse(data);}
export async function getRecord(user:string,id:string,kind?:string){if(id===MANAGED_MODEL_ID&&(!kind||kind==='profile')){const p=managedModel();if(p)return p;throw new Error('服务端模型尚未配置');}const r=await db().prepare('SELECT kind,data FROM records WHERE owner=? AND id=?').bind(user,id).first<{kind:string,data:string}>();if(!r||kind&&r.kind!==kind)throw new Error('记录不存在');return JSON.parse(r.data);}
export async function saveRecord(user:string,id:string,kind:string,data:unknown){assertEditable(id);await db().prepare('INSERT INTO records(owner,id,kind,data,updated) VALUES(?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET data=excluded.data,updated=excluded.updated WHERE records.kind=excluded.kind').bind(user,id,kind,JSON.stringify(data),Date.now()).run();}
export async function saveChatRecord(user:string,id:string,data:unknown,baseUpdated:unknown){
 assertEditable(id);const existing=await db().prepare('SELECT kind,updated FROM records WHERE owner=? AND id=?').bind(user,id).first<{kind:string,updated:number}>();
 if(!existing){
  if(baseUpdated!==undefined&&baseUpdated!==null)throw new Error('对话已在另一页面更新，请刷新后继续');
  const updated=Date.now(),created=await db().prepare('INSERT INTO records(owner,id,kind,data,updated) VALUES(?,?,?,?,?) ON CONFLICT(owner,id) DO NOTHING').bind(user,id,'chat',JSON.stringify(data),updated).run();
  if(created.meta.changes!==1)throw new Error('对话已在另一页面更新，请刷新后继续');
  return updated;
 }
 if(existing.kind!=='chat')throw new Error('记录类型冲突');
 if(!Number.isSafeInteger(baseUpdated)||baseUpdated!==existing.updated)throw new Error('对话已在另一页面更新，请刷新后继续');
 const updated=Math.max(Date.now(),existing.updated+1),saved=await db().prepare("UPDATE records SET data=?,updated=? WHERE owner=? AND id=? AND kind='chat' AND updated=?").bind(JSON.stringify(data),updated,user,id,existing.updated).run();
 if(saved.meta.changes!==1)throw new Error('对话已在另一页面更新，请刷新后继续');
 return updated;
}
