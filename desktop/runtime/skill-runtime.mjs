import path from 'node:path';
import {mkdir,mkdtemp,writeFile,readFile,lstat,realpath,readdir,rm,open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {sha256} from './documents.mjs';
import {prepareCommand,runCommand,commandEnvironment,commandJson} from './command.mjs';
export function skillPath(p){return typeof p==='string'&&p.length<=240&&!/[\x00-\x1f\\]/.test(p)&&!p.startsWith('/')&&!p.includes(':')&&p.split('/').every(s=>s&&s!=='.'&&s!=='..');}
export function skillScripts(pkg){return pkg.files.filter(f=>skillPath(f.path)&&/^(scripts|actions)\/.+\.(c?js|mjs|py)$/.test(f.path)).map(({path,sha256,bytes})=>({path,sha256,bytes}));}
export function verifiedSkillFiles(pkg){
 if(!Array.isArray(pkg.files)||pkg.files.length>256)throw Error('Skill资源清单超限');
 let total=0;const seen=new Set();
 return pkg.files.map(f=>{if(!skillPath(f.path))throw Error('Skill资源路径无效');const key=f.path.normalize('NFKC').toLowerCase();if(seen.has(key))throw Error('Skill资源路径冲突');seen.add(key);const bytes=Buffer.from(f.base64,'base64');total+=bytes.length;if(bytes.length!==f.bytes||sha256(bytes)!==f.sha256||bytes.length>4*1024**2||total>16*1024**2)throw Error('Skill资源完整性或大小检查失败');return {path:f.path,bytes,sha256:f.sha256};});
}
async function exact(root,relative){
 if(!skillPath(relative))throw Error('成果路径无效');let target=root;
 for(const part of relative.split('/')){target=path.join(target,part);if((await lstat(target)).isSymbolicLink())throw Error('拒绝符号链接');}
 if(await realpath(target)!==target)throw Error('路径发生变化');
 const handle=await open(target,constants.O_RDONLY|constants.O_NOFOLLOW);try{const st=await handle.stat();if(!st.isFile()||st.size>4*1024**2)throw Error('成果超限或非普通文件');const bytes=Buffer.alloc(4*1024**2+1);let size=0;while(size<bytes.length){const r=await handle.read(bytes,size,bytes.length-size,null);if(!r.bytesRead)break;size+=r.bytesRead;}if(size>4*1024**2)throw Error("成果读取超限");return bytes.subarray(0,size);}finally{await handle.close();}
}
export async function materializeSkill(pkg,root){
 const files=verifiedSkillFiles(pkg);await mkdir(root,{recursive:true,mode:0o700});const dir=await mkdtemp(path.join(root,'run-'));await mkdir(path.join(dir,'bundle'),{mode:0o700});await mkdir(path.join(dir,'output'),{mode:0o700});
 try{for(const f of files){const p=path.join(dir,'bundle',f.path);await mkdir(path.dirname(p),{recursive:true,mode:0o700});await writeFile(p,f.bytes,{flag:'wx',mode:0o600});}return {dir,files};}catch(e){await rm(dir,{recursive:true,force:true});throw e;}
}
export async function checkMaterialized(run){for(const f of run.files)if(sha256(await exact(path.join(run.dir,'bundle'),f.path))!==f.sha256)throw Error('执行期间Skill源码发生变化');}
export async function executeSkill(run,entry,args,input,{signal,onOutput}={}){
 if(!skillPath(entry)||!run.files.some(f=>f.path===entry)||! /^(scripts|actions)\/.+\.(c?js|mjs|py)$/.test(entry))throw Error('脚本不在已验证资源目录中');
 const python=entry.endsWith('.py'), cwd=path.join(run.dir,'bundle');
 const command=await prepareCommand([{id:'skill',path:cwd}],{folderId:'skill',relative:'',executable:python?'python3':'node',args:[...(python?['-E','-s','-B']:[]),path.join(cwd,entry),...args],timeoutMs:120000});
 await checkMaterialized(run);signal?.throwIfAborted();
 await writeFile(path.join(run.dir,'input.json'),JSON.stringify(input),{flag:'wx',mode:0o600});
 const support=path.join(run.dir,'support');await mkdir(support,{mode:0o700});await writeFile(path.join(support,'office.cjs'),await readFile(new URL('./vendor/office.cjs',import.meta.url)),{flag:'wx',mode:0o600});
 const environment={...commandEnvironment(),WILLBUDDY_INPUT:path.join(run.dir,'input.json'),WILLBUDDY_OUTPUT:path.join(run.dir,'output'),WILLBUDDY_OFFICE_MODULE:path.join(support,'office.cjs')};
 const result=await runCommand(command,{signal,onOutput,maxBytes:65536,environment});await checkMaterialized(run);
 if(!result.truncated){const parsed=commandJson(result.stdout);if(parsed!==undefined)result.structuredOutput=parsed;}
 const outputs=[];let total=0;
 if(result.status==='succeeded'){for(const name of await readdir(path.join(run.dir,'output'))){if(outputs.length>=8)throw Error('最多8份成果');const bytes=await exact(path.join(run.dir,'output'),name);total+=bytes.length;if(total>16*1024**2)throw Error('成果总大小超限');outputs.push({name,bytes:bytes.length,sha256:sha256(bytes)});}}
 return {...result,outputs};
}
export async function readSkillOutput(run,name){const expected=run.outputs.find(f=>f.name===name);if(!expected)throw Error('成果不存在');const bytes=await exact(path.join(run.dir,'output'),name);if(bytes.length!==expected.bytes||sha256(bytes)!==expected.sha256)throw Error('成果在批准后发生变化');return bytes;}
