export type ToolCall={id:string,type:'function',function:{name:string,arguments:string}};
export type Message={role:'user'|'assistant'|'system'|'tool',content:string,tool_calls?:ToolCall[],tool_call_id?:string};
export function modelEndpoint(base:string){
 let url:URL;try{url=new URL(base);}catch{throw new Error('请输入有效的模型服务地址');}
 const h=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port&&url.port!=='443'||!h.includes('.')||h.endsWith('.')||h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.test')||h.includes(':')||/^\d+[.\d]*$/.test(h))throw new Error('托管版只支持公网 HTTPS 模型地址，不支持内网或本机地址');
 return base.replace(/\/+$/,'')+'/chat/completions';
}
export function splitDocument(text:string){const parts:string[]=[];for(let i=0;i<text.length;i+=1000)parts.push(text.slice(i,i+1200));return parts;}
const stopTerms=new Set(['什么','怎么','如何','为何','是否','可以','需要','请问','相关','一个','进行','以及','或者','处理','哪些','一下','我们','这个','那个','情况','问题']);
const normalize=(value:string)=>String(value||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ');
export function terms(q:string){
 const value=normalize(q),latin=value.match(/[a-z0-9_][a-z0-9_.-]{1,}/g)||[],chinese=value.match(/[\u4e00-\u9fff]+/g)||[];
 const cjk:string[]=[];
 for(const run of chinese){
  if(run.length<=12)cjk.push(run);
  for(const size of [4,3,2])for(let i=0;i<=run.length-size;i++)cjk.push(run.slice(i,i+size));
 }
 return [...new Set([...latin,...cjk].filter(t=>!stopTerms.has(t)))].slice(0,120);
}
function count(text:string,term:string){let hits=0,at=0;while(hits<3&&(at=text.indexOf(term,at))>=0){hits++;at+=term.length;}return hits;}
function excerpt(content:string,matched:string[]){
 const normalized=normalize(content);let index=-1,chosen='';
 for(const term of [...matched].sort((a,b)=>b.length-a.length)){const at=normalized.indexOf(term);if(at>=0&&(index<0||term.length>chosen.length)){index=at;chosen=term;}}
 if(index<0)return content.slice(0,420);const start=Math.max(0,index-150),end=Math.min(content.length,index+chosen.length+270);
 return `${start?'…':''}${content.slice(start,end).trim()}${end<content.length?'…':''}`;
}
export type RetrievalEvidence={score:number,matchedTerms:string[],locator:string};
export function rankChunks<T extends {content:string,name:string,position?:number}>(rows:T[],q:string):Array<T&{excerpt:string,retrieval:RetrievalEvidence}>{
 const ts=terms(q);if(!ts.length)return [];
 const docs=rows.map(row=>({row,content:normalize(row.content),name:normalize(row.name)}));
 const frequency=new Map(ts.map(term=>[term,docs.filter(d=>d.content.includes(term)||d.name.includes(term)).length]));
 return docs.map((doc,index)=>{
  const matched=ts.filter(term=>doc.content.includes(term)||doc.name.includes(term));let score=0;
  for(const term of matched){const rarity=Math.log((docs.length+1)/((frequency.get(term)||0)+1))+1,length=1+Math.min(1.5,(term.length-2)*.25);score+=rarity*length*(count(doc.content,term)+count(doc.name,term)*2.5);}
  const phrase=normalize(q).replace(/[^a-z0-9\u4e00-\u9fff]+/g,'');if(phrase.length>=3&&phrase.length<=30&&doc.content.replace(/[^a-z0-9\u4e00-\u9fff]+/g,'').includes(phrase))score+=8;
  const coverage=matched.length/ts.length;score*=.75+coverage*.5;
  return {doc,index,matched,score};
 }).filter(x=>x.score>=1).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,8).map(({doc,matched,score})=>Object.assign({},doc.row,{excerpt:excerpt(doc.row.content,matched),retrieval:{score:Number(score.toFixed(2)),matchedTerms:matched.sort((a,b)=>b.length-a.length).slice(0,8),locator:Number.isInteger(doc.row.position)?`片段 ${(doc.row.position as number)+1}`:'来源片段'}}));
}
export function auditCitations(text:string,sourceCount:number){
 const cited=[...new Set([...String(text).matchAll(/\[(\d{1,3})\]/g)].map(x=>Number(x[1])))];
 const valid=cited.filter(n=>n>=1&&n<=sourceCount),invalid=cited.filter(n=>n<1||n>sourceCount);
 return {status:invalid.length?'invalid':valid.length?'valid':'none',valid,invalid,sourceCount,note:'仅校验引用编号存在；不代表引文含义已人工核实'};
}
export async function complete(profile:{baseUrl:string,model:string,maxTokens?:number,thinking?:boolean},key:string,messages:Message[],signal?:AbortSignal,tools?:unknown[]){
 if(!key.trim())throw new Error('请先在模型设置中填写本次会话的 API Key');
 const endpoint=modelEndpoint(profile.baseUrl);const start=Date.now();
 let response:Response;
 // workerd rejects redirect:'error' before any network request. Manual mode
 // plus explicit rejection preserves the no-redirect credential boundary.
 try{response=await fetch(endpoint,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:profile.model,messages,stream:false,...(tools?.length?{tools,tool_choice:'auto',parallel_tool_calls:false}:{}),max_tokens:profile.maxTokens||4096,...(new URL(profile.baseUrl).hostname==='api.deepseek.com'&&profile.thinking===false?{thinking:{type:'disabled'}}:{})}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(180000)]):AbortSignal.timeout(180000)});}catch{throw new Error('模型连接中断或超时，请检查服务地址与网络。重试可能产生新的调用费用。');}
 if(response.status>=300&&response.status<400){await response.body?.cancel();throw new Error('模型地址返回重定向，为保护密钥已停止请求。请填写服务商提供的最终 API 地址。');}
 if(!response.ok){await response.body?.cancel();throw new Error(response.status===401||response.status===403?'模型鉴权失败，请检查 API Key 和模型权限':response.status===429?'服务商限流或余额不足，请检查服务商账户':`模型服务返回 HTTP ${response.status}，请检查模型名与接口兼容性`);}
 const data=await response.json() as any;const message=data.choices?.[0]?.message;const text=message?.content;const toolCalls:ToolCall[]=tools?.length&&Array.isArray(message?.tool_calls)?message.tool_calls:[];
 if(!toolCalls.length&&(typeof text!=='string'||!text.trim()))throw new Error('模型未返回文本，请检查模型或提高最大输出 Token');
 return {text:typeof text==='string'?text:'',toolCalls,usage:{input:Number.isFinite(data.usage?.prompt_tokens)?data.usage.prompt_tokens:null,output:Number.isFinite(data.usage?.completion_tokens)?data.usage.completion_tokens:null},elapsed:Date.now()-start,truncated:data.choices?.[0]?.finish_reason==='length'};
}
