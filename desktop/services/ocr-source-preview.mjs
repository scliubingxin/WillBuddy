import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {runCommand} from '../runtime/command.mjs';
import {imageInfo} from '../src/shared/image-bytes.js';
import {selectOcrEvidence} from './ocr-source-open.mjs';

// The snapshot supplies the page and geometry. Paths come only from the host's
// native selector. A changed file or evidence invalidates the whole preview.
export async function previewOcrSource({store,reference,choose,read,tools,directory,run=runCommand,readImage}){
  const before=selectOcrEvidence(store,reference), regions=before.regions;
  if(!Array.isArray(regions)||!regions.length||regions.length>16||regions.some(r=>!r||typeof r!=='object'))throw Error('此证据没有可核对的页面定位');
  const pageNumbers=[...new Set(regions.map(r=>r.page))].sort((a,b)=>a-b);
  if(pageNumbers.length>5||pageNumbers.some(p=>!Number.isInteger(p)||!before.pages.includes(p)))throw Error('证据页码无效');
  for(const page of pageNumbers){
    const boxes=regions.filter(r=>r.page===page);
    for(const b of boxes)if(![b.x,b.y,b.w,b.h,b.width,b.height].every(Number.isInteger)||b.width<1||b.height<1||b.width>1600||b.height>1600||b.x<0||b.y<0||b.w<1||b.h<1||b.x+b.w>b.width||b.y+b.h>b.height||b.width!==boxes[0].width||b.height!==boxes[0].height)throw Error('证据坐标无效');
  }
  const file=await choose(before);if(!file)return false;
  if(typeof file!=='string'||!file.toLowerCase().endsWith('.pdf'))throw Error('请选择原PDF文件');
  const check=()=>{if(selectOcrEvidence(store,reference).fingerprint!==before.fingerprint)throw Error('证据已变化，请重试');};
  check();const bytes=await read(file);check();
  if(!Buffer.isBuffer(bytes)||bytes.length<5||bytes.length>16*1024*1024||bytes.subarray(0,5).toString()!=='%PDF-'||createHash('sha256').update(bytes).digest('hex')!==before.sha256)throw Error('所选PDF与此OCR来源不一致');
  const engine=await tools();check();if(typeof engine?.pdftoppm!=='string'||!path.isAbsolute(engine.pdftoppm))throw Error('本机PDF渲染工具不可用');
  await mkdir(directory,{recursive:true,mode:0o700});const dir=await mkdtemp(path.join(directory,'ocr-evidence-'));
  try{
    const pdf=path.join(dir,'source.pdf');await writeFile(pdf,bytes,{flag:'wx',mode:0o600});
    const pages=[];let total=0;
    for(const page of pageNumbers){
      const boxes=regions.filter(r=>r.page===page),prefix=path.join(dir,'page-'+page);
      const result=await run({executable:engine.pdftoppm,args:['-f',String(page),'-l',String(page),'-singlefile','-scale-to','1600','-png',pdf,prefix],cwd:dir,timeoutMs:30000},{maxBytes:65536});
      check();if(result.status!=='succeeded')throw Error('原PDF页面渲染失败');
      const image=await readImage(prefix+'.png');check();
      if(!Buffer.isBuffer(image)||image.length>4*1024*1024||(total+=image.length)>8*1024*1024)throw Error('页面预览超过大小限制');
      const info=imageInfo(image,{pngOnly:true});
      if(info.width!==boxes[0].width||info.height!==boxes[0].height)throw Error('原页渲染尺寸与OCR记录不一致，无法可靠定位');
      const current=await read(file);check();if(!Buffer.isBuffer(current)||!current.equals(bytes))throw Error('所选PDF已变化，请重新选择');
      pages.push({page,width:info.width,height:info.height,base64:image.toString('base64'),boxes:boxes.map(({x,y,w,h})=>({x,y,w,h}))});
    }
    return {pages,regionsTruncated:before.regionsTruncated};
  }finally{await rm(dir,{recursive:true,force:true});}
}
