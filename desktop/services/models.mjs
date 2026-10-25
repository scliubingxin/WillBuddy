import {uid,modelEndpoint} from '../core.mjs';
import {reasoningOptions,selectProfile,tiers,efforts} from '../runtime/model-policy.mjs';
export function createModelService({store,secrets,legacyKey=()=>''}){
 const sessions=new Map();let serial=Promise.resolve();
 const rows=()=>store.data.modelProfiles||[];
 const view=()=>rows().map(({encryptedKey,...p})=>({...p,hasKey:!!encryptedKey||sessions.has(p.id),keySaved:!!encryptedKey}));
 async function update(input){
  const p=structuredClone(input);const pending=serial.then(async()=>{
   const old=rows(),prior=old.find(m=>m.id===p.id);
   if(p.id&&!prior)throw Error('模型配置不存在');
   if(prior&&p.revision!==prior.revision)throw Error('模型配置已被修改，请重新打开');
   if(p.remove){store.data.modelProfiles=old.filter(m=>m.id!==p.id);try{await store.save();}catch(e){store.data.modelProfiles=old;throw e;}sessions.delete(p.id);return;}
   const checkText=(s,max)=>{if(typeof s!=='string'||!s.trim()||s.length>max||/[\x00-\x1f]/.test(s))throw Error('模型配置字段无效');return s.trim();};
   const baseUrl=checkText(p.baseUrl,500);modelEndpoint(baseUrl);
   const m={id:prior?.id||uid(),revision:(prior?.revision||0)+1,name:checkText(p.name,80),baseUrl,model:checkText(p.model,200),kind:p.kind,protocol:p.protocol,effort:p.effort,enabled:p.enabled===true,tools:p.tools===true,vision:p.vision===true,supportsOff:p.supportsOff===true,priority:Number(p.priority??10),maxInputChars:Number(p.maxInputChars??200000),outputTokens:Number(p.outputTokens??4096),tokenParameter:p.tokenParameter||'max_tokens'};
   if(!tiers.includes(m.kind)||!efforts.includes(m.effort)||!['none','openai','deepseek','qwen'].includes(m.protocol)||!Number.isInteger(m.priority)||m.priority<0||m.priority>100||!Number.isInteger(m.maxInputChars)||m.maxInputChars<1000||m.maxInputChars>2000000||!Number.isInteger(m.outputTokens)||m.outputTokens<256||m.outputTokens>32768||!['max_tokens','max_completion_tokens'].includes(m.tokenParameter))throw Error('模型类型/参数/预算无效');
   reasoningOptions(m,m.effort);
   m.keyRequired=p.clearKey?false:!!p.apiKey||!!prior?.keyRequired||!!prior?.encryptedKey;
   let nextSession=sessions.get(m.id);
   const changed=prior&&(prior.baseUrl!==m.baseUrl||prior.model!==m.model);
   if(changed&&(prior.encryptedKey||nextSession)&&!p.apiKey&&!p.clearKey)throw Error('模型或地址变化，请重新填写密钥或明确清除密钥');
   if(p.apiKey!==undefined&&typeof p.apiKey!=='string')throw Error('密钥格式无效');
   if(p.apiKey){if(p.apiKey.length>4096||/[\s\x00-\x1f\x7f]/.test(p.apiKey))throw Error('密钥含空白或超限');
    if(p.persistKey){m.encryptedKey=secrets.seal(p.apiKey);nextSession=undefined;}else nextSession=p.apiKey;
   }else if(!p.clearKey&&!changed&&prior?.encryptedKey)m.encryptedKey=prior.encryptedKey;
   if(p.clearKey){delete m.encryptedKey;nextSession=undefined;}
   const next=[...old.filter(x=>x.id!==m.id),m];if(next.length>20)throw Error('最多20个模型配置');
   store.data.modelProfiles=next;try{await store.save();}catch(e){store.data.modelProfiles=old;throw e;}
   if(nextSession)sessions.set(m.id,nextSession);else sessions.delete(m.id);
   return view().find(x=>x.id===m.id);
  });serial=pending.catch(()=>{});return pending;
 }
 function resolve(choice='legacy',effort,requirements={}){
  if(choice==='legacy'){
   const snapshot=JSON.stringify(store.data.settings),settings=structuredClone(store.data.settings);delete settings.encryptedKey;
   return {settings,metadata:{choice:'legacy',name:settings.model,model:settings.model,effort:'default'},check(){if(snapshot!==JSON.stringify(store.data.settings))throw Error('原模型配置已变化，请重新发送');},key:legacyKey};
  }
  const selected=selectProfile(rows(),choice,requirements),p=structuredClone(selected.profile),snapshot=JSON.stringify(p);
  // Auto tiers always control effort. Manual selections may explicitly override it.
  const level=choice.startsWith('auto:')?selected.effort:(effort||p.effort);
  reasoningOptions(p,level);
  const check=()=>{if(snapshot!==JSON.stringify(rows().find(x=>x.id===p.id)))throw Error('选中模型配置已变化/停用，请重新发送');};
  return {settings:{baseUrl:p.baseUrl,model:p.model,profileProtocol:p.protocol,effort:level,supportsOff:p.supportsOff,outputTokens:p.outputTokens,tokenParameter:p.tokenParameter},metadata:{choice,id:p.id,revision:p.revision,name:p.name,model:p.model,effort:level,protocol:p.protocol},check,
   checkMessages(messages){check();if(JSON.stringify(messages,(key,value)=>key==='url'&&typeof value==='string'&&value.startsWith('data:image/')?'[bounded image bytes]':value).length>p.maxInputChars)throw Error('消息超过此模型配置的字符预算；不会自动转给其他服务');},
   key(){check();const key=sessions.get(p.id)||(p.encryptedKey?secrets.open(p.encryptedKey):'');if(p.keyRequired&&!key)throw Error('此模型的临时密钥已失效，请重新填写；不会匿名降级');return key;}};
 }
 return {view,update,resolve,close:()=>sessions.clear()};
}
