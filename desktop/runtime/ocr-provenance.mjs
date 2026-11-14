import {createHash} from 'node:crypto';
const sha = value => createHash('sha256').update(value, 'utf8').digest('hex');

// Construct only from a host-held OCR receipt, never from model-supplied text.
export function makeOcrDocument(source, pages) {
  const name=source.name.replace(/[\u0000-\u001f]/g,' ');
  let text='# PDF OCR 识别成果\n\n来源：'+name+'\nSHA-256：'+source.sha256+'\n说明：机器识别可能有误，需对照原PDF核验。\n\n';
  if (Number.isInteger(source.totalPages) && source.totalPages>0 && source.totalPages<=100) text+='识别范围：第 '+pages.map(p=>p.page).join('、')+' 页（原文件共 '+source.totalPages+' 页）；未列出的页面未识别。\n\n';
  const ranges=[];
  for (const p of pages) {
    if (ranges.length) text+='\n\n';
    const start=text.length;
    const heading='## 第 '+p.page+' 页\n\n';
    text+=heading+(p.text||'（本页未识别出文字，不能证明原页为空）');
    const range={page:p.page,start,end:text.length};
    if (p.coordinateSpace && Array.isArray(p.boxes)) {
      const c=p.coordinateSpace;
      if (c.unit!=='pixel' || c.origin!=='top-left' || !Number.isInteger(c.width) || !Number.isInteger(c.height) || c.width<1 || c.width>1600 || c.height<1 || c.height>1600 || p.boxes.length>64) throw Error('OCR位置数据无效');
      range.coordinateSpace={unit:'pixel',origin:'top-left',width:c.width,height:c.height};
      range.boxes=p.boxes.map(b=>{
        if (!Number.isInteger(b.textStart)||!Number.isInteger(b.textEnd)||b.textStart<0||b.textEnd<=b.textStart||b.textEnd>p.text.length||p.text.slice(b.textStart,b.textEnd)!==b.text||![b.x,b.y,b.w,b.h].every(Number.isInteger)||b.x<0||b.y<0||b.w<1||b.h<1||b.x+b.w>c.width||b.y+b.h>c.height) throw Error('OCR位置数据无效');
        return {start:start+heading.length+b.textStart,end:start+heading.length+b.textEnd,x:b.x,y:b.y,w:b.w,h:b.h};
      });
      range.boxesTruncated=p.boxesTruncated===true;
    }
    ranges.push(range);
  }
  const provenance={version:1,name,sha256:source.sha256,textSha256:sha(text),ranges};
  if(ranges.some(r=>r.boxes))provenance.geometrySha256=sha(JSON.stringify(ranges));
  return {text,provenance};
}

// Invalid or edited metadata must never produce an asserted PDF page number.
export function ocrSourceForRange(document, start, end) {
  const p=document?.ocrProvenance, text=document?.text;
  if (!p || p.version!==1 || document.format!=='md' || typeof text!=='string' ||
      typeof p.name!=='string' || !p.name || p.name.length>255 || /[\u0000-\u001f]/.test(p.name) ||
      !/^[a-f0-9]{64}$/.test(p.sha256||'') || p.textSha256!==sha(text) ||
      p.textSha256!==document.sha256 || !Array.isArray(p.ranges) || p.ranges.length<1 || p.ranges.length>5 ||
      !Number.isInteger(start) || !Number.isInteger(end) || start<0 || end<=start || end>text.length) return null;
  if (p.ranges.some(r=>!r || typeof r!=='object' || Array.isArray(r))) return null;
  if ((p.geometrySha256!==undefined || p.ranges.some(r=>r.boxes!==undefined)) && p.geometrySha256!==sha(JSON.stringify(p.ranges))) return null;
  let lastEnd=0, lastPage=0;
  for (const r of p.ranges) {
    if (!Number.isInteger(r.page) || r.page<=lastPage || r.page>100 || !Number.isInteger(r.start) ||
        !Number.isInteger(r.end) || r.start<lastEnd || r.end<=r.start || r.end>text.length ||
        !text.startsWith('## 第 '+r.page+' 页\n\n',r.start)) return null;
    if(r.boxes!==undefined){
      const c=r.coordinateSpace;
      if(!Array.isArray(r.boxes)||r.boxes.length>64||!c||c.unit!=='pixel'||c.origin!=='top-left'||!Number.isInteger(c.width)||!Number.isInteger(c.height)||c.width<1||c.width>1600||c.height<1||c.height>1600) return null;
      let lastBoxEnd=r.start;
      for(const b of r.boxes){if(!b||typeof b!=='object'||!Number.isInteger(b.start)||!Number.isInteger(b.end)||b.start<lastBoxEnd||b.end<=b.start||b.end>r.end||![b.x,b.y,b.w,b.h].every(Number.isInteger)||b.x<0||b.y<0||b.w<1||b.h<1||b.x+b.w>c.width||b.y+b.h>c.height)return null;lastBoxEnd=b.end;}
    }
    lastEnd=r.end; lastPage=r.page;
  }
  const pages=p.ranges.filter(r=>r.start<end && start<r.end).map(r=>r.page);
  if(!pages.length)return null;
  const hits=[];let omitted=false;
  for(const r of p.ranges){if(!r.boxes||r.start>=end||start>=r.end)continue;for(const b of r.boxes){if(b.start<end&&start<b.end){if(hits.length<16)hits.push({page:r.page,start:b.start,end:b.end,x:b.x,y:b.y,w:b.w,h:b.h,width:r.coordinateSpace.width,height:r.coordinateSpace.height});else omitted=true;}}if(r.boxesTruncated)omitted=true;}
  return {name:p.name,sha256:p.sha256,pages,...(hits.length?{regions:hits,regionsTruncated:omitted,coordinateSpace:'rendered-page-pixel-top-left'}:{})};
}
