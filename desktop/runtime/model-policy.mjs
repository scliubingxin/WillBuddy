export const tiers=['fast','balanced','extreme'];
export const efforts=['off','low','medium','high'];
export function reasoningOptions(profile,effort){
 const mode=effort||profile.effort||'off',protocol=profile.protocol||'none';
 if(!efforts.includes(mode))throw Error('思考强度无效');
 if(protocol==='none'){if(mode!=='off')throw Error('此模型未配置思考参数，不能调整强度');return {};}
 if(protocol==='openai'){
  if(mode==='off'&&!profile.supportsOff)throw Error('此模型未声明支持关闭思考');
  return {reasoning_effort:mode==='off'?'none':mode};
 }
 if(protocol==='deepseek'){
  if(mode==='medium')throw Error('本DeepSeek适配仅发送关闭/低/高，请选择对应强度');
  return {thinking:{type:mode==='off'?'disabled':'enabled'},...(mode==='off'?{}:{reasoning_effort:mode})};
 }
 if(protocol==='qwen')return {enable_thinking:mode!=='off',...(mode==='off'?{}:{thinking_budget:{low:1024,medium:4096,high:16384}[mode]})};
 throw Error('未知思考参数协议');
}
export function tierEffort(profile,tier){
 if(tier==='fast')return 'off';
 if(tier==='extreme')return 'high';
 if(profile.protocol==='none')return 'off';
 return profile.protocol==='deepseek'?'low':'medium';
}
export function requestModelOptions(settings){
 if(!settings.profileProtocol)return {max_tokens:4096};
 const profile={protocol:settings.profileProtocol,supportsOff:settings.supportsOff};
 const output=settings.outputTokens||4096;
 if(!Number.isInteger(output)||output<256||output>32768)throw Error('模型输出预算无效');
 return {...reasoningOptions(profile,settings.effort),[settings.tokenParameter==='max_completion_tokens'?'max_completion_tokens':'max_tokens']:output};
}
export function selectProfile(profiles,choice,{tools=false,vision=false}={}){
 const eligible=p=>p.enabled&&(!tools||p.tools)&&(!vision||p.vision);
 if(choice.startsWith('profile:')){
  const p=profiles.find(p=>p.id===choice.slice(8));if(!p||!eligible(p))throw Error('所选模型不可用或不支持当前工具/图片需求');return {profile:p,effort:p.effort};
 }
 if(!choice.startsWith('auto:')||!tiers.includes(choice.slice(5)))throw Error('模型选择无效');
 const tier=choice.slice(5),candidates=profiles.filter(p=>p.kind===tier&&eligible(p)).filter(p=>{
  try{if(tier==='extreme'&&p.protocol==='none')return false;reasoningOptions(p,tierEffort(p,tier));return true;}catch{return false;}
 }).sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
 if(!candidates.length)throw Error('没有符合此档位及工具/视觉需求的模型，请配置模型；不会跨档位偷偷降级');
 return {profile:candidates[0],effort:tierEffort(candidates[0],tier)};
}
