import {openPackage,inspectDocument} from './documents.mjs';
const textExtensions=new Set(['md','txt','csv','json','html','js','ts','jsx','tsx','py','java','go','rs','c','cpp','h','css','sql','yaml','yml','xml','sh','toml','ini','log']);
const extensions=new Set(['docx','xlsx','pptx',...textExtensions]);
const formatFor=ext=>['docx','xlsx','pptx','html'].includes(ext)?ext:'md';
/** Bounded ZIP decoding in memory only. Never materialize paths or execute entries. */
export function parseChatUpload(name,input){
 const bytes=Buffer.from(input),ext=name.split('.').at(-1).toLowerCase();
 if(ext!=='zip'){
  if(!extensions.has(ext))throw Error('不支持此附件格式；压缩包请选择ZIP');
  const format=formatFor(ext);
  inspectDocument(format,bytes);return {items:[{name,format,bytes}],skipped:[]};
 }
 const all=decodeUploadArchive(bytes),items=[],skipped=[];let chars=0;
 for(const [path,data] of Object.entries(all)){
  if(path.endsWith('/'))continue;
  const ext=path.split('.').at(-1).toLowerCase();
  if(path.split('/').some(s=>s.startsWith('.')||s==='__MACOSX')||!extensions.has(ext)){skipped.push({path,reason:ext==='zip'?'不递归解压':'非支持正文格式或隐藏文件'});continue;}
  if(items.length>=32){skipped.push({path,reason:'超过32份可问答文件预算'});continue;}
  const format=formatFor(ext);
  if(['md','html'].includes(format)&&new TextDecoder('utf-8',{fatal:true}).decode(data).length>100000){skipped.push({path,reason:'单份正文超过10万字符预算'});continue;}
  const checked=inspectDocument(format,data);
  if(chars+checked.text.length>100000){skipped.push({path,reason:'超过正文合计10万字符预算'});continue;}
  chars+=checked.text.length;
  if(!checked.text.trim()){skipped.push({path,reason:'未提取到正文'});continue;}
  items.push({name:path.split('/').at(-1).slice(0,100),format,bytes:Buffer.from(data),archive:name,entryPath:path});
 }
 if(!items.length)throw Error('ZIP中没有支持的可问答正文文件（暂不解析PDF/图片/程序/嵌套压缩包）');
 return {items,skipped};
}

/** Exact archive entries, independent of the question-answer excerpt budget. */
export function decodeUploadArchive(input){
 const bytes=Buffer.from(input);
 if(bytes.length>32*1024*1024)throw Error('ZIP输入最多32MiB');
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw Error('ZIP无效');
 const count=bytes.readUInt16LE(end+10);if(count>2000)throw Error('ZIP最多2000条目');
 let p=bytes.readUInt32LE(end+16),total=0;const paths=[];
 for(let i=0;i<count;i++){
  if(p+46>end||bytes.readUInt32LE(p)!==0x02014b50)throw Error('ZIP清单截断');
  const len=bytes.readUInt16LE(p+28),extra=bytes.readUInt16LE(p+30),comment=bytes.readUInt16LE(p+32);
  if(p+46+len+extra+comment>end)throw Error('ZIP清单截断');
  const path=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(p+46,p+46+len)),mode=bytes.readUInt32LE(p+38)>>>16,kind=mode&0xf000;
  if(!path||path.length>200||/[\\:\x00-\x1f\x7f]/.test(path)||path.startsWith('/')||path.replace(/\/$/,'').split('/').some(s=>!s||s==='.'||s==='..')||[0xa000,0x6000,0x2000,0x1000,0xc000].includes(kind))throw Error('ZIP路径或特殊文件类型不安全');
  if(kind&&kind!==0x8000&&kind!==0x4000)throw Error('ZIP文件类型不支持');
  const size=bytes.readUInt32LE(p+24);total+=size;
  if(size>4194304||total>16*1024*1024)throw Error('ZIP单文件4MiB/展开合计16MiB超限');
  paths.push(path);p+=46+len+extra+comment;
 }
 const folded=new Set();for(const path of paths){const key=path.normalize('NFKC').toLowerCase();if(folded.has(key))throw Error('ZIP路径规范化冲突');folded.add(key);}
 return openPackage(bytes,{chatArchive:true});
}
