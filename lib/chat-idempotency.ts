import {db,getRecord} from './workspace';

const REPLAY_WINDOW_MS=24*60*60*1000;
const REQUEST_ID=/^[A-Za-z0-9._:-]{8,100}$/;

type Claim={id:string,chat:string,digest:string};
type BeginResult={claim?:Claim,replayed?:Record<string,unknown>};

function assistantMessage(id:string,result:any){
 if(!result||typeof result!=='object'||typeof result.text!=='string')throw new Error('模型回复格式无效');
 const message:any={role:'assistant',requestId:id,content:result.text};
 for(const key of ['artifacts','proposals','sources','usage','model','truncated','events','explanation','citationAudit'])if(result[key]!==undefined)message[key]=result[key];
 return message;
}

async function persistCompletedReply(user:string,chatId:string,requestId:string,result:unknown){
 const reply=assistantMessage(requestId,result);
 for(let attempt=0;attempt<2;attempt++){
  const row=await db().prepare("SELECT data,updated FROM records WHERE owner=? AND id=? AND kind='chat'").bind(user,chatId).first<{data:string,updated:number}>();
  if(!row)return false;
  let chat:any;try{chat=JSON.parse(row.data);}catch{return false;}
  const messages=Array.isArray(chat?.messages)?chat.messages:[];
  if(messages.some((message:any)=>message?.role==='assistant'&&message?.requestId===requestId))return true;
  const matches=messages.reduce((indexes:number[],message:any,index:number)=>{
   if(message?.role==='user'&&message?.requestId===requestId)indexes.push(index);
   return indexes;
  },[]);
  if(matches.length!==1)return false;
  const index=matches[0],following=messages[index+1];
  if(following?.role==='assistant'&&!following?.requestId&&following?.content===reply.content)return true;
  const merged=[...messages];
  merged.splice(index+1,0,reply);
  const next=JSON.stringify({...chat,messages:merged});
  if(next.length>350000)return false;
  const saved=await db().prepare("UPDATE records SET data=?,updated=? WHERE owner=? AND id=? AND kind='chat' AND data=?").bind(next,Math.max(Date.now(),row.updated+1),user,chatId,row.data).run();
  if(saved.meta.changes===1)return true;
 }
 return false;
}

function digestInput(data:any){
 return JSON.stringify({
  chatId:data.chatId,profileId:data.profileId,spaceId:data.spaceId||'',scope:data.scope||'',web:!!data.web,
  datasetId:data.datasetId||'',attachments:data.attachments||[],agentId:data.agentId||'',documentTools:!!data.documentTools,
  messages:data.messages||[],instruction:data.instruction||'',
 });
}

async function sha256(value:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export async function beginChatRequest(user:string,data:any):Promise<BeginResult>{
 if(data.requestId===undefined)return {};
 if(typeof data.requestId!=='string'||!REQUEST_ID.test(data.requestId))throw new Error('消息请求标识无效');
 if(typeof data.chatId!=='string'||!data.chatId||data.chatId.length>100)throw new Error('对话标识无效');
 await getRecord(user,data.chatId,'chat');
 const digest=await sha256(digestInput(data)),now=Date.now();
 await db().prepare('DELETE FROM chat_requests WHERE owner=? AND updated<?').bind(user,now-REPLAY_WINDOW_MS).run();
 const inserted=await db().prepare("INSERT INTO chat_requests(owner,id,chat,digest,status,response,updated) VALUES(?,?,?,?, 'running',NULL,?) ON CONFLICT(owner,id) DO NOTHING").bind(user,data.requestId,data.chatId,digest,now).run();
 if(inserted.meta.changes===1)return {claim:{id:data.requestId,chat:data.chatId,digest}};
 const row=await db().prepare('SELECT chat,digest,status,response FROM chat_requests WHERE owner=? AND id=?').bind(user,data.requestId).first<{chat:string,digest:string,status:string,response:string|null}>();
 if(!row||row.chat!==data.chatId||row.digest!==digest)throw new Error('消息请求标识已用于其他内容');
 if(row.status==='completed'&&row.response){
  const replayed=JSON.parse(row.response);
  if(!replayed||typeof replayed!=='object')throw new Error('消息重放记录无效');
  await persistCompletedReply(user,data.chatId,data.requestId,replayed);
  return {replayed:{...replayed,reused:true}};
 }
 throw new Error('该消息仍在处理中，请稍后重试');
}

export async function replayChatRequest(user:string,chat:string,id:string){
 if(typeof id!=='string'||!REQUEST_ID.test(id))throw new Error('消息请求标识无效');
 if(typeof chat!=='string'||!chat||chat.length>100)throw new Error('对话标识无效');
 await getRecord(user,chat,'chat');
 const row=await db().prepare('SELECT status,response FROM chat_requests WHERE owner=? AND id=? AND chat=?').bind(user,id,chat).first<{status:string,response:string|null}>();
 if(!row)throw new Error('没有可恢复的回复，请重新发送问题');
 if(row.status!=='completed'||!row.response)throw new Error('该消息仍在处理中，请稍后重试');
 const replayed=JSON.parse(row.response);
 if(!replayed||typeof replayed!=='object')throw new Error('消息重放记录无效');
 await persistCompletedReply(user,chat,id,replayed);
 return {...replayed,reused:true};
}

export async function completeChatRequest(user:string,claim:Claim,result:unknown){
 const response=JSON.stringify(result);
 if(response.length>600000)throw new Error('模型回复过大，无法安全保存');
 const completed=await db().prepare("UPDATE chat_requests SET status='completed',response=?,updated=? WHERE owner=? AND id=? AND chat=? AND digest=? AND status='running' AND EXISTS(SELECT 1 FROM records WHERE owner=? AND id=? AND kind='chat')").bind(response,Date.now(),user,claim.id,claim.chat,claim.digest,user,claim.chat).run();
 if(completed.meta.changes!==1)throw new Error('原始对话或消息状态已改变，未交付回复');
 await persistCompletedReply(user,claim.chat,claim.id,result);
}

export async function abandonChatRequest(user:string,claim:Claim){
 await db().prepare("DELETE FROM chat_requests WHERE owner=? AND id=? AND chat=? AND digest=? AND status='running'").bind(user,claim.id,claim.chat,claim.digest).run();
}
