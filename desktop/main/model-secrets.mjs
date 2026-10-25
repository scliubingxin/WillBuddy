/** Keep legacy Actwill OS identity. Only host receives the encrypted bytes. */
export function createModelSecretCodec(safeStorage){
 const available=()=>safeStorage.isEncryptionAvailable()&&safeStorage.getSelectedStorageBackend?.()!=='basic_text';
 return {seal(key){if(!available())throw Error('系统安全存储不可用，请选择仅本次运行保存密钥');try{return safeStorage.encryptString(key).toString('base64');}catch{throw Error('模型密钥加密失败');}},open(cipher){if(!available())throw Error('系统安全存储不可用，不能读取模型密钥');try{return safeStorage.decryptString(Buffer.from(cipher,'base64'));}catch{throw Error('模型密钥无法解密，请重新配置');}}};
}
