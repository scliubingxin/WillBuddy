import path from 'node:path';
import {rm} from 'node:fs/promises';
import {uid} from '../core.mjs';
import {createDocumentService} from './documents.mjs';
import {materializeSkill,executeSkill,verifiedSkillFiles,readSkillOutput,skillScripts} from '../runtime/skill-runtime.mjs';
const runtimes=new WeakMap();
export function sharedSkillExecution(store){if(!runtimes.has(store))runtimes.set(store,createSkillExecution(store));return runtimes.get(store);}
export function createSkillExecution(store){
 const root=path.join(store.dir,'skill-runs');store.data.skillRuns??=[];
 for(const row of store.data.skillRuns)if(['running','pending_approval'].includes(row.status)){row.status='interrupted';row.finishedAt=Date.now();}
 function current(pkg){const p=store.data.skillPackages?.find(x=>x.id===pkg.id);if(!p||!p.enabled||p.revision!==pkg.revision||p.sha256!==pkg.sha256)throw Error('Skill版本已变化或停用');verifiedSkillFiles(p);return p;}
 async function audit(tool,metadata,ctx,work){const row={id:uid(),tool,args:metadata,chatId:ctx.chatId,runId:ctx.runId,time:Date.now(),status:'pending_approval'};store.data.executions??=[];store.data.executions.unshift(row);try{await store.save();const value=await work(row);row.status=value.status;return value;}catch(e){row.status=ctx.signal?.aborted?'cancelled':row.status==='denied'?'denied':'failed';throw e;}finally{row.finishedAt=Date.now();row.result={status:row.status,note:'Skill输入参数及正文不重复写入审计；真实输出保留于运行记录'};await store.save();ctx.notify?.();}}
 return {
 async run(pkg,args,ctx){
  if(Object.keys(args).some(k=>!['name','path','args','input'].includes(k)))throw Error('Skill执行参数无效');
  const argv=args.args??[],input=args.input??{};
  if(!Array.isArray(argv)||argv.length>20||JSON.stringify(argv).length>300||argv.some(a=>typeof a!=='string'||a.length>1000||/[\x00-\x1f]/.test(a)))throw Error('Skill参数超限');
  if(!input||typeof input!=='object'||Array.isArray(input)||JSON.stringify(input).length>20000)throw Error('Skill输入须为有界JSON对象');
  if(!skillScripts(pkg).some(f=>f.path===args.path))throw Error('脚本不在资源目录中');
  const snapshot=structuredClone(current(pkg)),check=()=>{ctx.check();ctx.signal?.throwIfAborted();current(snapshot);};check();
  return audit('skill_run',{name:pkg.name,path:args.path,sha256:pkg.sha256},ctx,async auditRow=>{
   const row={id:uid(),skillId:pkg.id,revision:pkg.revision,sha256:pkg.sha256,chatId:ctx.chatId,runId:ctx.runId,status:'pending_approval',time:Date.now()};store.data.skillRuns.unshift(row);
   let materialized;
   try{
    if((await ctx.approve('执行 Skill 脚本',JSON.stringify(pkg.name)+'\n脚本 '+args.path+'\n包SHA '+pkg.sha256+'\n参数 '+JSON.stringify(argv)+'\n输入 '+JSON.stringify(input).length+' 字符；输出将发送当前模型。\n120秒/64KiB输出。以本机账号权限运行，可访问包外文件及网络，不是OS沙箱；不自动安装依赖。',ctx.signal))!==true){auditRow.status='denied';row.status='denied';throw Error('用户拒绝该操作');}
    check();materialized=await materializeSkill(snapshot,root);check();row.directory=path.basename(materialized.dir);row.status='running';await store.save();check();
    const result=await executeSkill(materialized,args.path,argv,input,{signal:ctx.signal});check();
    row.status=result.status;row.outputs=result.outputs;row.result=result;row.finishedAt=Date.now();await store.save();check();
    return {...result,executionId:row.id};
   }catch(e){row.status=ctx.signal?.aborted?'cancelled':row.status==='denied'?'denied':'failed';row.finishedAt=Date.now();throw e;}
   finally{
    if(row.status!=='succeeded'&&materialized){await rm(materialized.dir,{recursive:true,force:true});row.directory=null;}
    const terminal=store.data.skillRuns.filter(r=>!['running','pending_approval'].includes(r.status));for(const old of terminal.slice(20)){if(/^run-[A-Za-z0-9]+$/.test(old.directory||''))await rm(path.join(root,old.directory),{recursive:true,force:true});store.data.skillRuns=store.data.skillRuns.filter(r=>r!==old);}
    await store.save();
   }
  });
 },
 async importOutput(pkg,args,ctx){
  const row=store.data.skillRuns.find(r=>r.id===args.executionId);const check=()=>{ctx.check();ctx.signal?.throwIfAborted();current(pkg);if(!row||row.status!=='succeeded'||row.skillId!==pkg.id||row.revision!==pkg.revision||row.sha256!==pkg.sha256||row.chatId!==ctx.chatId||row.runId!==ctx.runId||!/^run-[A-Za-z0-9]+$/.test(row.directory||''))throw Error('成果不属于当前任务或版本');};check();
  return audit('skill_import_output',{name:pkg.name,executionId:args.executionId,file:args.file},ctx,async a=>{
   if((await ctx.approve('回收 Skill 成果',JSON.stringify(args.file)+'\n导入当前任务的已验证成果副本，原件不改。',ctx.signal))!==true){a.status='denied';throw Error('用户拒绝该操作');}check();
   const bytes=await readSkillOutput({dir:path.join(root,row.directory),outputs:row.outputs},args.file);check();const format=path.extname(args.file).slice(1).toLowerCase();
   return createDocumentService({store,notify:ctx.notify}).importFile(args.file,format,bytes,ctx.signal,check);
  });
 }
 };
}
