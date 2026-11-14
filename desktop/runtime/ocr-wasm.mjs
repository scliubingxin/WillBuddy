import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {commandEnvironment,runCommand} from './command.mjs';
const ROOT=fileURLToPath(new URL('./vendor/ocr-wasm/',import.meta.url));
const MANIFEST_SHA='d1b6eba5c2f4e89926de3faa1414ecd7355383832638a93bc89eba49a27726b1';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function wasmOcrEngine(){try{
 const raw=await readFile(path.join(ROOT,'MANIFEST.json'));if(sha(raw)!==MANIFEST_SHA)throw Error();
 for(const rel of ['data/eng.traineddata','deps/tesseract.js-core/tesseract-core.js','deps/tesseract.js-core/tesseract-core.wasm','deps/tesseract.js-core/tesseract-core-simd.js','deps/tesseract.js-core/tesseract-core-simd.wasm','deps/tesseract.js-core/tesseract-core-relaxedsimd.js','deps/tesseract.js-core/tesseract-core-relaxedsimd.wasm']){const st=await lstat(path.join(ROOT,rel));if(!st.isFile()||st.isSymbolicLink())throw Error();}
 return {wasm:true};
 }catch{throw Error('此版本未内置可用的离线 OCR 引擎或语言数据');}}
// The manifest is pinned by application code; it detects damaged packaged files,
// not a malicious party able to rewrite both executable and manifest.
export async function materializeWasmOcr(target,{root=ROOT,signal,guard=()=>{}}={}){
 const raw=await readFile(path.join(root,'MANIFEST.json'));if(sha(raw)!==MANIFEST_SHA)throw Error('离线 OCR 资源清单校验失败');
 let manifest;try{manifest=JSON.parse(raw.toString('utf8'));}catch{throw Error('离线 OCR 资源清单无效');}
 if(manifest.schema!==1||!Array.isArray(manifest.files)||manifest.files.length<1||manifest.files.length>150)throw Error('离线 OCR 资源清单无效');
 const seen=new Set();let total=0;
 for(const entry of manifest.files){
  signal?.throwIfAborted();guard();const rel=entry?.path;
  if(typeof rel!=='string'||! /^[A-Za-z0-9._/-]+$/.test(rel)||rel.startsWith('/')||rel.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(rel)||!Number.isInteger(entry.size)||entry.size<0||entry.size>5*1024*1024||! /^[a-f0-9]{64}$/.test(entry.sha256||''))throw Error('离线 OCR 资源路径无效');
  seen.add(rel);total+=entry.size;if(total>20*1024*1024)throw Error('离线 OCR 资源超限');
  const src=path.join(root,...rel.split('/')),stat=await lstat(src);if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==entry.size)throw Error('离线 OCR 资源已变化');
  const bytes=await readFile(src);if(bytes.length!==entry.size||sha(bytes)!==entry.sha256)throw Error('离线 OCR 资源校验失败');
  const out=path.join(target,...rel.split('/'));await mkdir(path.dirname(out),{recursive:true,mode:0o700});await writeFile(out,bytes,{flag:'wx',mode:0o600});
 }
 signal?.throwIfAborted();guard();return {script:path.join(target,'recognize.cjs')};
}
export async function runWasmOcr({input,directory,language,signal,guard=()=>{},run=runCommand,root=ROOT}){
 if(language!=='eng')throw Error('此版本离线 OCR 尚未内置中文语言数据');
 const target=path.join(directory,'ocr-runtime');await mkdir(target,{mode:0o700});const {script}=await materializeWasmOcr(target,{root,signal,guard});
 const env=commandEnvironment();env.HOME=directory;env.TMPDIR=directory;env.NODE_PATH=path.join(target,'deps');
 const result=await run({executable:process.execPath,args:[script,input,language],cwd:directory,timeoutMs:60000},{signal,maxBytes:65536,environment:env});
 signal?.throwIfAborted();guard();if(result.status!=='succeeded')throw Error('离线 OCR 识别失败：'+result.status);if(typeof result.stdout!=='string'||result.stdout.length>65536)throw Error('离线 OCR 输出无效或超限');return 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'+result.stdout;
}
