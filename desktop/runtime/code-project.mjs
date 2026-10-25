import {decodeUploadArchive} from './chat-archive.mjs';
import {createHash} from 'node:crypto';
export const fileHash=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Parse manifests without executing code. A project is never a model-authored path. */
export function inspectCodeProject(bytes){
 const all=decodeUploadArchive(bytes),files=Object.entries(all).filter(([p])=>!p.endsWith('/'));
 const candidates=files.filter(([p])=>/(^|\/)(package.json|requirements.txt|pyproject.toml)$/.test(p)&&!p.split('/').some(x=>['node_modules','.git','.venv','__MACOSX'].includes(x)));
 const roots=[...new Set(candidates.map(([p])=>p.slice(0,p.lastIndexOf('/')+1)))];
 if(roots.length!==1)throw Error(roots.length?'代码包有多个项目根目录，请分别打包后上传':'未找到package.json、requirements.txt或pyproject.toml');
 const root=roots[0],selected=files.filter(([p])=>p.startsWith(root)).map(([p,b])=>[p.slice(root.length),Buffer.from(b)]);
 if(selected.some(([p])=>p.split('/').some(x=>['node_modules','.git','.venv'].includes(x))))throw Error('代码包请排除node_modules、.git和.venv');
 const map=new Map(selected);let kind,steps=[];
 if(map.has('package.json')){
  kind='node';let manifest;try{manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(map.get('package.json')));}catch{throw Error('package.json不是有效JSON');}
  const scripts=manifest.scripts||{};
  steps.push({id:'install',label:'安装依赖（不执行安装脚本）',executable:'npm',args:map.has('package-lock.json')?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts','--package-lock=false','--no-audit','--no-fund']});
  for(const key of ['dev','start','build','test'])if(typeof scripts[key]==='string'&&scripts[key].length<=400)steps.push({id:key,label:key,executable:'npm',args:['run',key],script:scripts[key]});
  if(steps.length===1)throw Error('package.json没有受支持的dev/start/build/test脚本');
 }else{
  kind='python';steps.push({id:'venv',label:'创建独立Python虚拟环境',executable:'python3',args:['-m','venv','.venv']});
  if(map.has('requirements.txt'))steps.push({id:'install',label:'安装requirements依赖',executable:'.venv/bin/python',args:['-m','pip','install','-r','requirements.txt']});
  for(const entry of ['main.py','app.py','server.py'])if(map.has(entry))steps.push({id:'run:'+entry,label:'运行 '+entry,executable:'.venv/bin/python',args:[entry]});
  if(steps.length===1)throw Error('Python项目需要requirements.txt或main.py/app.py/server.py入口；暂不自动处理pyproject构建系统');
 }
 return {kind,root,steps,files:selected.map(([name,bytes])=>({name,bytes,sha256:fileHash(bytes)}))};
}
