import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
try{writeFileSync('.dev.vars','VAULT_MASTER_KEY='+randomBytes(32).toString('base64')+'\n',{flag:'wx',mode:0o600});console.log('本地密钥文件已创建。请妥善保留，不要提交到版本库。');}catch(e){if(e.code==='EEXIST'){console.error('已有本地变量文件，未覆盖。请在现有文件中配置 VAULT_MASTER_KEY。');process.exitCode=1;}else throw e;}
