import {modelEndpoint} from '../core.mjs';
import {modelMaxSteps} from '../runtime/model-policy.mjs';
import {requiredText} from './validation.mjs';

// Stage every setting and credential before publishing; a failed save restores the old state.
export function createLegacyModelSettings({store,safeStorage,getSessionKey,setSessionKey,isBusy}) {
 let serial=Promise.resolve();
 return function update(input) {
  const p=structuredClone(input);
  const pending=serial.then(async()=>{
   if(isBusy()) throw Error('请等待当前请求结束再修改模型');
   const old=store.data.settings, next={...old};
   let nextKey=getSessionKey();
   if(p.baseUrl){modelEndpoint(p.baseUrl);next.baseUrl=requiredText(p.baseUrl,500);}
   if(p.model)next.model=requiredText(p.model,200);
   if(p.name)next.name=requiredText(p.name,100);
   if(p.maxSteps!==undefined)next.maxSteps=modelMaxSteps(p.maxSteps);
   if(p.clearKey){delete next.encryptedKey;nextKey='';}
   if(typeof p.apiKey==='string'&&p.apiKey){
    if(p.apiKey.length>2000)throw Error('密钥过长');
    if(p.persistKey){
     if(!safeStorage.isEncryptionAvailable()||safeStorage.getSelectedStorageBackend?.()==='basic_text')throw Error('系统钥匙串不可用，请取消“加密保存密钥”后仅在本次运行使用');
     try{next.encryptedKey=safeStorage.encryptString(p.apiKey).toString('base64');}catch{throw Error('模型密钥加密失败');}
     nextKey='';
    }else{nextKey=p.apiKey;delete next.encryptedKey;}
   }
   if(isBusy())throw Error('请等待当前请求结束再修改模型');
   store.data.settings=next;
   try{await store.save();}catch(error){if(store.data.settings===next)store.data.settings=old;throw error;}
   setSessionKey(nextKey);
  });
  serial=pending.catch(()=>{});
  return pending;
 };
}
