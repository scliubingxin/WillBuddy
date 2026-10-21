import { uid } from '../core.mjs';
import { prepareCommand, runCommand } from './command.mjs';
export class ToolRuntime {
 constructor({store,browser,approve,notify=()=>{}}){this.store=store;this.browser=browser;this.approve=approve;this.notify=notify;}
async execute(name,args,signal,{chatId,runId,manual=false}={}){
 const auditArgs=structuredClone(args);if(name==='browser_fill'&&'text' in auditArgs)auditArgs.text='[输入文本已隐藏]';
 const record={id:uid(),tool:name,args:auditArgs,chatId,runId,time:Date.now(),status:'pending_approval'};
 this.store.data.executions.unshift(record);this.store.data.executions=this.store.data.executions.slice(0,200);await this.store.save();this.notify();
 let prepared;
 try{
  if(!['cli_execute','browser_open','browser_read','browser_snapshot','browser_click','browser_fill'].includes(name))throw new Error('未知工具');
  let command,readScope;
  if(['browser_read','browser_snapshot'].includes(name)){readScope=this.browser.list().find(w=>w.id===args.id);if(!readScope)throw new Error('浏览器窗口已关闭或不存在');record.receipt={operation:name,...readScope};}
  if(name==='cli_execute'){command=await prepareCommand(this.store.data.folders,args);record.command=command;}
  if(['browser_click','browser_fill'].includes(name)){prepared=await this.browser.prepareAction(name,args,signal);record.receipt=this.browser.receipt(prepared);}
  const title=name==='cli_execute'?'执行本机 CLI':name==='browser_read'?'读取网页内容':name==='browser_snapshot'?'检查网页元素':name==='browser_click'?'点击网页元素':name==='browser_fill'?'填写网页文本框':'打开浏览器';
  const detail=prepared?JSON.stringify(record.receipt,null,2)+(name==='browser_fill'?'\n将填写（不自动提交）：\n'+prepared.inputText:'\n点击可能触发网页业务操作，请核对网址与目标。'):name==='cli_execute'?JSON.stringify(command,null,2)+'\nCLI 会以当前账号权限运行，可访问工作目录以外的文件，不是文件夹沙箱。'+(chatId?'\nstdout/stderr 将发给当前模型。':''):['browser_read','browser_snapshot'].includes(name)?JSON.stringify(this.browser.list().find(w=>w.id===args.id)||{id:args.id},null,2)+'\n将读取当前页正文；对话发起的读取会将正文发给模型。':String(args.url);
  if(!(manual&&name==='browser_open')&&!await this.approve(title,detail,signal)){record.status='denied';record.result={status:'denied',message:'用户拒绝该操作，不得声称执行成功'};return record.result;}
  signal?.throwIfAborted();if(readScope&&this.browser.list().find(w=>w.id===args.id)?.url!==readScope.url)throw new Error('审批期间网页地址发生变化，请重新确认');record.status='running';await this.store.save();this.notify();
  let result;
  if(name==='cli_execute'){
    const checked=await prepareCommand(this.store.data.folders,args);if(checked.cwd!==command.cwd||checked.executable!==command.executable)throw new Error('工作目录或程序路径在审批期间发生变化，请重新执行');
    let streamed=0;result=await runCommand(checked,{signal,onOutput:chunk=>{const part=chunk.text.slice(0,Math.max(0,50000-streamed));streamed+=part.length;record.partial=(record.partial||'')+part;this.notify();}});delete record.partial;
  }else if(name==='browser_open')result=await this.browser.open(args.url,args.external===true,signal);
  else if(name==='browser_read')result=await this.browser.read(args.id,signal);
  else if(name==='browser_snapshot')result=await this.browser.snapshot(args.id,signal);
  else if(prepared)result=await this.browser.perform(prepared,signal);
  else throw new Error('未知工具');
  record.result=result;record.status=result.status||'succeeded';return result;
 }catch(e){record.status=signal?.aborted?'cancelled':'failed';record.result={status:record.status,error:e.message};if(signal?.aborted)throw e;return record.result;}
 finally{if(prepared)this.browser.discard(prepared);record.finishedAt=Date.now();this.store.log('工具执行 · '+record.status,name);await this.store.save();this.notify();}
}

}
