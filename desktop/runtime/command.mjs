import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { stat, access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolveGranted } from '../core.mjs';
export function commandEnvironment(source=process.env) {
  const env={};
  for(const name of ['HOME','USERPROFILE','APPDATA','LOCALAPPDATA','SystemRoot','WINDIR','TEMP','TMP','TMPDIR','LANG','LC_ALL','SHELL','COMSPEC','PATHEXT','USER','LOGNAME'])if(source[name])env[name]=source[name];
  const home=source.HOME||source.USERPROFILE||homedir();
  const extras=process.platform==='win32'?[path.join(home,'AppData','Roaming','npm')]:['/opt/homebrew/bin','/usr/local/bin',path.join(home,'.local','bin'),path.join(home,'.cargo','bin'),path.join(home,'.npm-global','bin'),'/usr/bin','/bin'];
  env.PATH=[source.PATH||'',...extras].filter(Boolean).join(path.delimiter);
  // Electron is the Node runtime used by the app; node children must run as Node.
  env.ELECTRON_RUN_AS_NODE='1';return env;
}
async function resolveExecutable(executable) {
  if(executable==='node'&&process.versions.electron)return process.execPath;
  if(path.isAbsolute(executable)){await access(executable,constants.X_OK);return executable;}
  if(executable.includes('/')||executable.includes('\\'))throw new Error('程序路径请使用绝对路径');
  const directories=commandEnvironment().PATH.split(path.delimiter);
  if(process.platform!=='win32'){
    try{const base=path.join(homedir(),'.nvm','versions','node');for(const version of (await readdir(base)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})))directories.push(path.join(base,version,'bin'));}catch{}
    directories.push(path.join(homedir(),'.volta','bin'));
  }
  const extensions=process.platform==='win32'?['','.exe','.com']:[''];
  for(const directory of directories.filter(Boolean))for(const extension of extensions){const target=path.resolve(directory,executable+extension);try{await access(target,constants.X_OK);if((await stat(target)).isFile())return target;}catch{}}
  throw new Error(`找不到命令 ${executable}。请先安装此 CLI，或填写其绝对路径。`);
}
export async function prepareCommand(folders,p) {
  if(typeof p.executable!=='string'||!p.executable.trim()||p.executable.length>1024||/[\0\r\n]/.test(p.executable))throw new Error('请输入可执行文件名或绝对路径');
  if(!Array.isArray(p.args)||p.args.length>100||p.args.some(a=>typeof a!=='string'||a.length>10000||a.includes('\0')))throw new Error('参数必须是字符串数组，最多 100 项');
  const cwd=await resolveGranted(folders,p.folderId,p.relative||'');if(!(await stat(cwd)).isDirectory())throw new Error('工作目录必须是文件夹');
  const timeoutMs=p.timeoutMs===undefined?120000:p.timeoutMs;if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>300000)throw new Error('超时必须在 100 到 300000 毫秒之间');
  return {executable:await resolveExecutable(p.executable.trim()),requestedExecutable:p.executable.trim(),args:[...p.args],cwd,timeoutMs};
}
export function runCommand(command,{signal,onOutput=()=>{},maxBytes=1024*1024}={}) {
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new Error('执行已取消'));return;}
    const started=Date.now();let child,stdout='',stderr='',bytes=0,stopped='',forceTimer,settled=false,pipeTimer;
    let timer;
    function kill(){
      if(!child?.pid)return;
      if(process.platform==='win32'){const killer=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.on('error',()=>child.kill());}
      else{try{process.kill(-child.pid,'SIGTERM');}catch{try{child.kill('SIGTERM');}catch{}}forceTimer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},800);forceTimer.unref();}
    }
    function stop(reason){if(!stopped){stopped=reason;kill();}}
    const abort=()=>stop('cancelled');
    function finish(exitCode,exitSignal,error){if(settled)return;settled=true;clearTimeout(timer);clearTimeout(pipeTimer);if(!stopped)clearTimeout(forceTimer);signal?.removeEventListener('abort',abort);if(error){reject(new Error(error.code==='ENOENT'?`找不到命令 ${command.executable}。请安装此 CLI，或填写其绝对路径。`:error.message));return;}resolve({stdout,stderr,exitCode,signal:exitSignal,elapsedMs:Date.now()-started,status:stopped||(exitCode===0?'succeeded':'failed'),truncated:stopped==='output_limit'});}
    try{child=spawn(command.executable,command.args,{cwd:command.cwd,env:commandEnvironment(),shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});}catch(e){finish(null,null,e);return;}
    for(const [stream,field] of [[child.stdout,'stdout'],[child.stderr,'stderr']]){stream.setEncoding('utf8');stream.on('data',chunk=>{const remaining=Math.max(0,maxBytes-bytes);const received=Buffer.byteLength(chunk);const part=Buffer.from(chunk).subarray(0,remaining).toString('utf8');bytes+=received;if(field==='stdout')stdout+=part;else stderr+=part;onOutput({stream:field,text:part});if(bytes>maxBytes)stop('output_limit');});}
    child.once('error',e=>finish(null,null,e));
    child.once('exit',(code,sig)=>{pipeTimer=setTimeout(()=>{stop('inherited_pipes');child.stdout.destroy();child.stderr.destroy();finish(code,sig);},1000);pipeTimer.unref();});
    child.once('close',(code,sig)=>finish(code,sig));
    timer=setTimeout(()=>stop('timed_out'),command.timeoutMs);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  });
}
