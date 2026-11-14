import {mkdtemp,writeFile,rm,mkdir,access,realpath} from 'node:fs/promises';
import {constants} from 'node:fs';import path from 'node:path';
import {imageFromBase64,imageInfo} from '../src/shared/image-bytes.js';
import {sha256} from './documents.mjs';
import {runCommand,commandEnvironment} from './command.mjs';
import {runWasmOcr,wasmOcrEngine} from './ocr-wasm.mjs';
export function validateOcrImage(data,id,allowed){
 if(typeof id!=='string'||!Array.isArray(allowed)||!allowed.includes(id))throw Error('仅可识别本轮用户明确附加的图片');
 const row=data.imageAttachments?.find(x=>x.id===id);if(!row)throw Error('图片不存在或已移除');const bytes=Buffer.from(imageFromBase64(row.base64));const info=imageInfo(bytes,{pngOnly:true});
 if(bytes.length!==row.bytes||sha256(bytes)!==row.sha256)throw Error('图片完整性校验失败');
 return {id,sha256:row.sha256,name:row.name,bytes,width:info.width,height:info.height};
}
export async function bundledOcrEngine(resourcesPath=process.resourcesPath){
 if(!resourcesPath)return wasmOcrEngine();
 const root=path.join(resourcesPath,'runtimes','ocr');let executable,dataDirectory;
 try{executable=await realpath(path.join(root,'bin','tesseract'));dataDirectory=await realpath(path.join(root,'share','tessdata'));await access(executable,constants.X_OK);}catch{return wasmOcrEngine();}
 if(!executable.startsWith(root+path.sep)||!dataDirectory.startsWith(root+path.sep))throw Error('OCR运行时路径无效');return {executable,dataDirectory};
}
export function parseOcrTsv(tsv,width,height){
 if(typeof tsv!=='string'||tsv.length>65536||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw Error('OCR定位数据无效');
 const rows=tsv.replace(/\r\n/g,'\n').split('\n'),header=rows.shift();if(header!=='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext')throw Error('OCR定位格式无效');
 const boxes=[];let text='',last='',count=0;
 for(const row of rows){if(!row)continue;const f=row.split('\t');if(f.length!==12)throw Error('OCR定位行无效');if(f[0]!=='5')continue;
  const word=f[11].trim();if(!word)continue;const fields=f.slice(1,10);if(fields.some(x=>!/^\d{1,8}$/.test(x))||! /^-?\d+(?:\.\d+)?$/.test(f[10]))throw Error('OCR坐标格式无效');const n=fields.map(Number),conf=Number(f[10]);if(n.some(x=>!Number.isInteger(x)||x<0)||!Number.isFinite(conf)||conf< -1||conf>100)throw Error('OCR坐标或置信度无效');
  const [page,block,paragraph,line,wordNum,x,y,w,h]=n;if(!w||!h||x+w>width||y+h>height||word.length>1000||/[\x00-\x1f]/.test(word))throw Error('OCR文字或坐标超出图片');
  const key=[page,block,paragraph,line].join(':');if(text)text+=key!==last?'\n':' ';last=key;const textStart=text.length;text+=word;const textEnd=text.length;
  count++;if(boxes.length<64)boxes.push({text:word,textStart,textEnd,x,y,w,h,confidence:conf<0?null:Math.round(conf*100)/100});
 }
 if(text.length>30000)throw Error('OCR 文字超过30000字符');return {text,boxes,boxesTruncated:count>boxes.length,coordinateSpace:{unit:'pixel',origin:'top-left',width,height}};
}
export async function recognizeImage({image,engine,directory,language='eng',signal,guard=()=>{},run=runCommand,allowEmpty=false}){
 if(!['eng','chi_sim','chi_sim+eng'].includes(language))throw Error('不支持该 OCR 语言');
 if(!image||!Buffer.isBuffer(image.bytes)||!engine||(!engine.wasm&&(!engine.executable||!path.isAbsolute(engine.executable)))||!directory)throw Error('OCR运行环境未就绪');
 guard();signal?.throwIfAborted();await mkdir(directory,{recursive:true,mode:0o700});const dir=await mkdtemp(path.join(directory,'ocr-'));
 try{const input=path.join(dir,'source.png');await writeFile(input,image.bytes,{flag:'wx',mode:0o600});guard();signal?.throwIfAborted();
 let tsv;
 if(engine.wasm)tsv=await runWasmOcr({input,directory:dir,language,signal,guard,run});
 else {const env=commandEnvironment();if(engine.dataDirectory)env.TESSDATA_PREFIX=engine.dataDirectory;
  const result=await run({executable:engine.executable,args:[input,'stdout','-l',language,'--psm','3','tsv'],cwd:dir,timeoutMs:30000},{signal,maxBytes:65536,environment:env});
  signal?.throwIfAborted();guard();if(result.status!=='succeeded')throw Error('OCR 识别失败：'+result.status+'；请检查引擎和语言数据');tsv=result.stdout;}
 const parsed=parseOcrTsv(tsv,image.width,image.height);if(!parsed.text&&!allowEmpty)throw Error('未识别出文字');return {status:'succeeded',...parsed,source:{id:image.id,sha256:image.sha256,name:image.name,width:image.width,height:image.height},language,note:'自动识别结果可能有误，需对照原图核验；坐标为所处理图片像素。'};
 }finally{await rm(dir,{recursive:true,force:true});}
}
