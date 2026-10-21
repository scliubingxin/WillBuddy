import path from 'node:path';
import { stat } from 'node:fs/promises';
// Display/product naming must not silently abandon an existing workspace or vault.
export async function chooseUserDataDirectory(appData) {
  const existing=[];
  for(const name of ['WillBuddy','Actwill AI','actwill-desktop']){
    const dir=path.join(appData,name);
    try{const info=await stat(path.join(dir,'workspace.json'));if(info.isFile())existing.push({dir,time:info.mtimeMs});}catch(e){if(e.code!=='ENOENT')throw e;}
  }
  existing.sort((a,b)=>b.time-a.time);
  return existing[0]?.dir||path.join(appData,'actwill-desktop');
}
