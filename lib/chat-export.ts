type ChatMessage={role?:unknown,content?:unknown,model?:unknown,usage?:unknown,sources?:unknown,artifacts?:unknown,artifactSummaries?:unknown,feedback?:unknown,truncated?:unknown};

function text(value:unknown,max=350000){return typeof value==='string'?value.slice(0,max):'';}
function number(value:unknown){return typeof value==='number'&&Number.isFinite(value)?value:null;}
function safeUrl(value:unknown){if(typeof value!=='string')return '';try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.toString():'';}catch{return '';}}
function safeName(value:unknown,fallback:string){const name=text(value,160).trim();return name||fallback;}
function mdInline(value:string){return value.replace(/[\\`*_{}\[\]()<>#+\-.!|]/g,'\\$&').replace(/\s+/g,' ').trim();}
function mdBlock(value:string){return ['```text',value.replace(/```/g,'``\u200b`'),'```'];}

export function exportFilename(name:unknown,extension:'md'|'json'){
 const base=safeName(name,'幕云AI对话').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,120).trim()||'幕云AI对话';
 return `${base}.${extension}`;
}

export function sanitizedConversation(data:any,sourceRevision:number,exportedAt:string){
 const rawMessages=Array.isArray(data?.messages)?data.messages:[];
 const messages=rawMessages.slice(0,1000).map((message:ChatMessage)=>{
  const sources=Array.isArray(message?.sources)?message.sources.slice(0,100).map((source:any)=>({
   number:number(source?.number),name:safeName(source?.name,'未命名来源'),locator:text(source?.retrieval?.locator,200),url:safeUrl(source?.url),excerpt:text(source?.excerpt||source?.content,2000)
  })):[];
  const rawArtifacts=Array.isArray(message?.artifacts)?message.artifacts:Array.isArray(message?.artifactSummaries)?message.artifactSummaries:[],artifacts=rawArtifacts.slice(0,100).map((artifact:any)=>({
   name:safeName(artifact?.name,'未命名成果'),size:number(artifact?.size),sha256:/^[a-f0-9]{64}$/i.test(text(artifact?.sha256,64))?text(artifact.sha256,64).toLowerCase():''
  }));
  const rawUsage:any=message?.usage&&typeof message.usage==='object'?message.usage:null,usage=rawUsage?{input:number(rawUsage.input),output:number(rawUsage.output),elapsed:number(rawUsage.elapsed)}:null;
  return {role:message?.role==='assistant'?'assistant':'user',content:text(message?.content),model:text(message?.model,200),usage,sources,artifacts,feedback:text(message?.feedback,50),truncated:message?.truncated===true};
 });
 return {schema:'muyun-chat-export/v1',brand:'幕云AI',title:safeName(data?.name,'未命名对话'),exportedAt,sourceRevision,messages};
}

export function importedConversation(payload:any){
 if(!payload||typeof payload!=='object'||payload.schema!=='muyun-chat-export/v1'||typeof payload.title!=='string'||!payload.title.trim()||payload.title.length>160||!Array.isArray(payload.messages)||!payload.messages.length||payload.messages.length>1000)throw new Error('对话 JSON 格式无效或版本不受支持');
 for(const message of payload.messages)if(!message||typeof message!=='object'||!['user','assistant'].includes(message.role)||typeof message.content!=='string'||message.content.length>350000)throw new Error('对话 JSON 包含无效消息');
 const safe=sanitizedConversation({name:payload.title,messages:payload.messages},0,new Date(0).toISOString()),messages=safe.messages.map(({artifacts,...message}:any)=>({...message,...(artifacts.length?{artifactSummaries:artifacts}:{})}));
 const name=`${safe.title}（导入）`.slice(0,200),sourceRevision=Number.isSafeInteger(payload.sourceRevision)&&payload.sourceRevision>=0?payload.sourceRevision:null,exportedAt=typeof payload.exportedAt==='string'&&!Number.isNaN(Date.parse(payload.exportedAt))?new Date(payload.exportedAt).toISOString():null;
 const imported={name,messages,mode:'chat',importedFrom:{schema:'muyun-chat-export/v1',sourceRevision,exportedAt}};
 if(JSON.stringify(imported).length>350000)throw new Error('对话过大，无法导入');return imported;
}

export function conversationMarkdown(data:any,sourceRevision:number,exportedAt:string){
 const safe=sanitizedConversation(data,sourceRevision,exportedAt),lines=[`# ${mdInline(safe.title)}`,'',`- 导出时间：${safe.exportedAt}`,'- 来源版本：'+safe.sourceRevision,'- 说明：仅包含可读对话、来源和已完成成果摘要；不包含待执行提议、授权、请求标识或内部存储地址。',''];
 safe.messages.forEach((message:any,index:number)=>{
  lines.push(`## ${index+1}. ${message.role==='assistant'?'幕云AI助手':'用户'}`,'',...mdBlock(message.content||'（空消息）'),'');
  if(message.model)lines.push(`模型：${mdInline(message.model)}`,'');
  if(message.usage&&(message.usage.input!==null||message.usage.output!==null))lines.push(`用量：${message.usage.input??'—'} 输入 / ${message.usage.output??'—'} 输出 Token`,'');
  if(message.sources.length){lines.push('### 来源','');message.sources.forEach((source:any)=>{const label=[source.name,source.locator].filter(Boolean).map(mdInline).join(' · ');lines.push(`- ${source.number?`\[${source.number}\] `:''}${label}${source.url?` — ${source.url}`:''}`);if(source.excerpt)lines.push(...mdBlock(source.excerpt));});lines.push('');}
  if(message.artifacts.length){lines.push('### 已完成成果','');message.artifacts.forEach((artifact:any)=>lines.push(`- ${mdInline(artifact.name)}${artifact.size!==null?` · ${artifact.size} 字节`:''}${artifact.sha256?` · SHA-256 ${artifact.sha256}`:''}`));lines.push('');}
  if(message.truncated)lines.push('> 此回复曾达到输出上限，内容可能不完整。','');
 });
 return lines.join('\n').trimEnd()+'\n';
}
