import {isServiceStep,checkServicePolicy} from '../runtime/project-service-policy.mjs';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile,readFile,lstat,rm,realpath} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {inspectCodeProject,fileHash} from '../runtime/code-project.mjs';
const live=new Set(['queued','pending_approval','running','cancelling']);
/** Host-owned workspaces; CLI still runs with the user's OS privileges, not an OS sandbox. */
export function createCodeProjects({store,directory,approve,commands}){
 let serial=Promise.resolve();const lock=fn=>{const p=serial.then(fn);serial=p.catch(()=>{});return p;};
 const rows=()=>store.data.codeProjects||[];
 const find=id=>{const p=rows().find(p=>p.id===id);if(!p)throw Error('项目不存在');return p;};
 const view=()=>rows().map(({id,name,kind,steps,inventory,jobs,time})=>({id,name,kind,steps,files:inventory.map(x=>x.name),jobs,time}));
 async function check(p){
  const base=await realpath(directory),target=path.join(base,p.id);if((await lstat(target)).isSymbolicLink()||await realpath(target)!==target)throw Error('项目工作目录已变化');
  for(const f of p.inventory){let walk=target;for(const part of f.name.split('/')){walk=path.join(walk,part);if((await lstat(walk)).isSymbolicLink())throw Error('项目文件路径变为链接');}if(fileHash(await readFile(walk))!==f.sha256)throw Error('项目源码已变化，请重新导入后确认');}
  return target;
 }
 return {view,
  async validate(args,policy){if(args.folderId?.startsWith("project:")){const p=find(args.folderId.slice(8));const cwd=await check(p);const grant=store.data.folders.find(f=>f.id===args.folderId);if(!grant||await realpath(grant.path)!==cwd)throw Error('项目目录授权已变化');if(policy){checkServicePolicy(policy,args);const step=p.steps.find(s=>s.id===policy.stepId);if(!step||args.executable!==(step.executable.startsWith('.venv/')?path.join(cwd,step.executable):step.executable)||JSON.stringify(step.args)!==JSON.stringify(args.args))throw Error('项目服务启动步骤已变化');}}},
  importArchive:(name,bytes)=>lock(async()=>{
   if(rows().length>=10)throw Error('最多保留10个代码项目');
   const parsed=inspectCodeProject(bytes),id=randomUUID();
   await mkdir(directory,{recursive:true,mode:0o700});
   const temp=await mkdtemp(path.join(directory,'.import-'));
   try{
    for(const f of parsed.files){const destination=path.join(temp,f.name);await mkdir(path.dirname(destination),{recursive:true,mode:0o700});await writeFile(destination,f.bytes,{flag:'wx',mode:0o600});}
    const {rename}=await import('node:fs/promises');await rename(temp,path.join(directory,id));
    const row={id,name,kind:parsed.kind,steps:parsed.steps,inventory:parsed.files.map(({name,sha256})=>({name,sha256})),jobs:[],time:Date.now()};
    const before=store.data.codeProjects;store.data.codeProjects=[...rows(),row];
    try{await store.save();}catch(e){store.data.codeProjects=before;throw e;}
    return view().find(p=>p.id===id);
   }catch(e){await rm(temp,{recursive:true,force:true});await rm(path.join(directory,id),{recursive:true,force:true});throw e;}
  }),
  run:(id,stepId,{service=false}={})=>lock(async()=>{
   if(service&&!isServiceStep(stepId))throw Error('安装、构建与测试不支持服务模式');
   const p=find(id),step=p.steps.find(s=>s.id===stepId);if(!step)throw Error('未知项目步骤');
   if(p.jobs.some(j=>live.has(store.data.commandJobs?.find(x=>x.id===j.jobId)?.status)))throw Error('项目已有执行，请先停止或等待结束');
   const cwd=await check(p);
   // Explicit native grant before registering this host-owned directory. Queue tool approval follows.
   if(!store.data.folders.some(f=>f.id==='project:'+id)){
    if(!await approve('准备代码项目运行目录',`${p.name}\n${p.kind} · ${p.inventory.length}个文件\n依赖安装可能联网，启动脚本以当前账号权限执行，可访问项目以外文件。此目录不是系统沙箱。`))throw Error('项目运行未获授权');
    await check(p);store.data.folders.push({id:'project:'+id,name:'代码项目：'+p.name,path:cwd});
    try{await store.save();}catch(e){store.data.folders=store.data.folders.filter(f=>f.id!=='project:'+id);throw e;}
   }
   const executable=step.executable.startsWith('.venv/')?path.join(cwd,step.executable):step.executable;
   const jobId=randomUUID(),before=p.jobs;
   p.jobs=[...p.jobs,{jobId,stepId,service,time:Date.now()}].slice(-30);
   try{await store.save();}catch(e){p.jobs=before;throw e;}
   try{const request={id:jobId,folderId:'project:'+id,executable,args:step.args,timeoutMs:300000};const job=service?await commands.enqueueProjectService(request,{projectId:id,stepId}):await commands.enqueue(request);return {project:view().find(x=>x.id===id),job};}
   catch(e){p.jobs.find(x=>x.jobId===jobId).submissionError=e.message;await store.save();throw e;}

  })
 };
}
