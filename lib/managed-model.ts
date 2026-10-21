import {env} from 'cloudflare:workers';
export const MANAGED_MODEL_ID='managed-deepseek';
// The credential is only usable with this server-owned provider and fixed origin.
// This Site is owner-private; do not widen its audience without a separate budget/access policy.
export function managedModel(){return (env as any).DEEPSEEK_API_KEY?{id:MANAGED_MODEL_ID,kind:'profile',name:'DeepSeek · 已配置',baseUrl:'https://api.deepseek.com',model:'deepseek-flash',maxTokens:2048,thinking:false,managed:true,updated:0}:null;}
export function managedKey(id:string){return id===MANAGED_MODEL_ID?String((env as any).DEEPSEEK_API_KEY||''):'';}
export function assertEditable(id:string|null){if(id===MANAGED_MODEL_ID)throw new Error('这是服务端管理的连接，请添加自己的模型配置进行自定义');}
