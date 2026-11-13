/** Current native Calc rectangle; inferred constants or explicit literal text, never formulas. */
export function cellRange(ref){
 const m=typeof ref==='string'&&ref.match(/^([A-Z]{1,2})([1-9][0-9]{0,3})(?::([A-Z]{1,2})([1-9][0-9]{0,3}))?$/);
 if(!m)throw Error('请选择单一A1格式矩形范围');
 const col=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),left=col(m[1]),top=+m[2],right=col(m[3]||m[1]),bottom=+(m[4]||m[2]);
 if(right<left||bottom<top||right>128||bottom>5000||right-left+1>16||bottom-top+1>30||(right-left+1)*(bottom-top+1)>200)throw Error('AI区域限128列5000行内的30行16列200格');
 return {ref:m[1]+m[2]+(left===right&&top===bottom?'':':'+(m[3]||m[1])+(m[4]||m[2])),rows:bottom-top+1,columns:right-left+1};
}
export function cellSelection(selection){
 const range=cellRange(selection?.ref);
 if(!Number.isInteger(selection.part)||selection.part<0||selection.part>99||selection.rows!==range.rows||selection.columns!==range.columns||selection.ref!==range.ref||typeof selection.fingerprint!=='string'||!(/^[0-9a-f]{64}$/).test(selection.fingerprint))throw Error('原生表格选区无效');
 return range;
}
export function cellMatrix(values,selection){
 const range=cellSelection(selection);
 if(!Array.isArray(values)||values.length!==range.rows||values.some(row=>!Array.isArray(row)||row.length!==range.columns))throw Error('输出矩阵必须与当前选区行列完全一致');
 const copy=values.map(row=>row.map(value=>{
  const literal=value!==null&&typeof value==='object'&&!Array.isArray(value);
  if(literal){if(Object.keys(value).length!==1||!Object.hasOwn(value,'text'))throw Error('文本单元格仅接受text字段');value=value.text;}
  if(typeof value!=='string'||value.length>400||/[\uD800-\uDFFF]/u.test(value)||/[\u0000-\u001f\u007f-\u009f]/u.test(value))throw Error('每格须为不含控制符的单行字符串，最多400字符');
  const start=value.normalize('NFKC').trimStart();if(!literal&&(/^[=+@]/u.test(start)||start.startsWith('-')&&!/^-\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(start)))throw Error('此工具只写常量，不接受公式或表达式');
  return literal?{text:value}:value;
 }));
 if(JSON.stringify({values:copy}).length>600)throw Error('单次单元格修改超过600字符，请缩小选区');
 return copy;
}
export const officeCellsDefinition={type:'function',function:{name:'office_update_cells',description:'经单独批准把当前Excel原生矩形选区替换为同尺寸常量矩阵。values按行排列：普通单行字符串沿用内核类型识别；需要原样保留前导零、日期样式或公式样式文本时使用单字段对象{text:"00123"}，强制文本并核验保存类型，等号等只作文本不执行；不保证日期/特殊文本自动转换，保存值校验不一致时拒绝发布。会覆盖选区内原内容（包括已有公式），不扩大范围。不支持公式、合并选区、多区域、跨表、结构增删；最多30行16列200格，JSON最多600字符。与其他修改共用每轮一次额度。',parameters:{type:'object',properties:{values:{type:'array',items:{type:'array',items:{anyOf:[{type:'string',maxLength:400},{type:'object',properties:{text:{type:'string',maxLength:400}},required:['text'],additionalProperties:false}]}}}},required:['values'],additionalProperties:false}}};

import office from './vendor/office.cjs';import path from 'node:path';import {createHash} from 'node:crypto';
// Compare decimal values exactly, without collapsing adjacent large integers.
function exactDecimal(raw){
 const m=/^([+-]?)([0-9]+)(?:\.([0-9]*))?(?:[eE]([+-]?[0-9]+))?$/.exec(raw);if(!m||raw.length>1000||Math.abs(Number(m[4]||0))>10000)throw Error('Excel数值格式无效或超限');
 let digits=(m[2]+(m[3]||'')).replace(/^0+/,'');if(!digits)return '0';let power=Number(m[4]||0)-(m[3]||'').length;while(digits.endsWith('0')){digits=digits.slice(0,-1);power++;}return (m[1]==='-'?'-':'')+digits+'e'+power;
}
// Record cell values and formulas outside the approved rectangle. Cached
// formula results may legitimately change during recalculation, so compare the
// formula itself but not its cached value. Styles and drawings are not covered.
function workbookOutside(bytes,cells,preserveTarget=false){
 const files=office.zip.unzipSync(bytes),S='http://schemas.openxmlformats.org/spreadsheetml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const parse=name=>{if(!files[name])throw Error('Excel验收缺少部件');return new office.DOMParser({onError:()=>{throw Error('Excel验收XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files[name]),'application/xml');};
 const nodes=(n,name)=>Array.from(n.getElementsByTagNameNS(S,name));
 const sheets=nodes(parse('xl/workbook.xml'),'sheet'),rels=Array.from(parse('xl/_rels/workbook.xml.rels').getElementsByTagNameNS('*','Relationship'));
 if(!sheets.length||sheets.length>100||cells.part>=sheets.length)throw Error('Excel工作表数量或选区无效');
 const strings=files['xl/sharedStrings.xml']?nodes(parse('xl/sharedStrings.xml'),'si').map(n=>nodes(n,'t').map(t=>t.textContent).join('')):[];
 const m=cells.ref.match(/^([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?$/),col=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),left=col(m[1]),top=Number(m[2]),right=col(m[3]||m[1]),bottom=Number(m[4]||m[2]);let count=0;
 return sheets.map((sheet,part)=>{
  const matches=rels.filter(r=>r.getAttribute('Id')===sheet.getAttributeNS(R,'id'));if(matches.length!==1||matches[0].getAttribute('TargetMode')==='External'||!/\/worksheet$/.test(matches[0].getAttribute('Type')))throw Error('Excel工作表关系无效');
  const target=matches[0].getAttribute('Target'),file=target.startsWith('/')?target.slice(1):path.posix.normalize(path.posix.join('xl',target));if(!/^xl\/worksheets\/[^/]+\.xml$/.test(file))throw Error('Excel工作表路径无效');
  const entries=[],seen=new Set();for(const c of nodes(parse(file),'c')){
   if(++count>100000)throw Error('Excel验收超过10万单元格');const ref=c.getAttribute('r'),match=ref.match(/^([A-Z]{1,3})([1-9][0-9]{0,6})$/);if(!match||seen.has(ref))throw Error('Excel单元格坐标无效或重复');seen.add(ref);
   const x=col(match[1]),y=Number(match[2]);if(!preserveTarget&&part===cells.part&&x>=left&&x<=right&&y>=top&&y<=bottom)continue;
   const fs=nodes(c,'f');if(fs.length>1)throw Error('Excel单元格公式重复');let value;
   if(fs.length){const f=fs[0];value=['formula',f.textContent,f.getAttribute('t')||'',f.getAttribute('ref')||'',f.getAttribute('si')||''];}
   else{const t=c.getAttribute('t')||'n',vs=nodes(c,'v'),raw=vs[0]?.textContent||'';if(vs.length>1)throw Error('Excel单元格值重复');
    if(t==='s'){if(!/^\d+$/.test(raw)||Number(raw)>=strings.length)throw Error('Excel共享文字索引无效');value=['text',strings[Number(raw)]];}
    else if(t==='inlineStr')value=['text',nodes(c,'t').map(n=>n.textContent).join('')];
    else if(t==='str')value=['text',raw];
    else if(t==='n'&&raw)value=['number',exactDecimal(raw)];
    else if(t==='b'||t==='e'||t==='d')value=[t,raw];
    else if(!raw&&t==='n')continue;else throw Error('Excel单元格类型不支持核验');
   }
   entries.push([ref,value]);
  }
  entries.sort((a,b)=>a[0].localeCompare(b[0]));return {name:sheet.getAttribute('name'),entries};
 });
}
export function workbookContentsVerifier(before,cells,{preserveTarget=false}={}){
 cellSelection(cells);const original=JSON.stringify(workbookOutside(before,cells,preserveTarget));
 // Export may rename parts; compare media bytes as a multiset. This does not
 // verify anchor positions, effects, cropping, or overall visual fidelity.
 const media=bytes=>{
  const files=office.zip.unzipSync(bytes),A='http://schemas.openxmlformats.org/drawingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const parse=name=>{if(!files[name])throw Error('Excel图片关系缺失');return new office.DOMParser({onError:()=>{throw Error('Excel图片关系XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files[name]),'application/xml');};
  for(const drawing of Object.keys(files).filter(n=>/^xl\/drawings\/[^/]+\.xml$/.test(n))){
   const blips=Array.from(parse(drawing).getElementsByTagNameNS(A,'blip'));if(!blips.length)continue;
   const relfile=path.posix.join(path.posix.dirname(drawing),'_rels',path.posix.basename(drawing)+'.rels'),rels=Array.from(parse(relfile).getElementsByTagNameNS('*','Relationship'));
   for(const blip of blips){const id=blip.getAttributeNS(R,'embed');if(!id||blip.getAttributeNS(R,'link'))throw Error('Excel图片必须引用内部资源');const matches=rels.filter(r=>r.getAttribute('Id')===id);if(matches.length!==1||matches[0].getAttribute('TargetMode')==='External'||!matches[0].getAttribute('Type').endsWith('/image'))throw Error('Excel图片关系无效');const target=matches[0].getAttribute('Target'),resolved=target?.startsWith('/')?path.posix.normalize(target.slice(1)):path.posix.normalize(path.posix.join(path.posix.dirname(drawing),target||''));if(!/^xl\/media\/[^/]+$/.test(resolved)||!files[resolved])throw Error('Excel图片资源不存在或路径无效');}
  }
  return Object.keys(files).filter(n=>/^xl\/media\/[^/]+$/.test(n)).map(n=>createHash('sha256').update(files[n]).digest('hex')).sort();
 };
 const originalMedia=JSON.stringify(media(before));
 // Keep the ordered image identities per worksheet too, so swapping images
 // between worksheets or shapes cannot pass a byte-multiset-only receipt.
 const placements=bytes=>{
  const files=office.zip.unzipSync(bytes),S='http://schemas.openxmlformats.org/spreadsheetml/2006/main',A='http://schemas.openxmlformats.org/drawingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',X='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
  const parse=n=>{if(!files[n])throw Error('Excel图片关系缺失');return new office.DOMParser({onError:()=>{throw Error('Excel图片关系XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files[n]),'application/xml');};
  const relationships=n=>Array.from(parse(n).getElementsByTagNameNS('*','Relationship'));
  const resolve=(source,rel,id,type,pattern)=>{const found=rel.filter(r=>r.getAttribute('Id')===id);if(found.length!==1||found[0].getAttribute('TargetMode')==='External'||!found[0].getAttribute('Type').endsWith('/'+type))throw Error('Excel图片关系无效');const t=found[0].getAttribute('Target'),n=t?.startsWith('/')?path.posix.normalize(t.slice(1)):path.posix.normalize(path.posix.join(path.posix.dirname(source),t||''));if(!pattern.test(n)||!files[n])throw Error('Excel图片资源不存在或路径无效');return n;};
  const workbook='xl/workbook.xml',sheets=Array.from(parse(workbook).getElementsByTagNameNS(S,'sheet')),wrels=relationships('xl/_rels/workbook.xml.rels');
  return sheets.map(sheet=>{
   const filename=resolve(workbook,wrels,sheet.getAttributeNS(R,'id'),'worksheet',/^xl\/worksheets\/[^/]+\.xml$/),drawings=Array.from(parse(filename).getElementsByTagNameNS(S,'drawing'));if(!drawings.length)return [];
   const relname=path.posix.join(path.posix.dirname(filename),'_rels',path.posix.basename(filename)+'.rels'),srels=relationships(relname),hashes=[];
   for(const drawing of drawings){const name=resolve(filename,srels,drawing.getAttributeNS(R,'id'),'drawing',/^xl\/drawings\/[^/]+\.xml$/),blips=Array.from(parse(name).getElementsByTagNameNS(A,'blip'));if(!blips.length)continue;const drels=relationships(path.posix.join(path.posix.dirname(name),'_rels',path.posix.basename(name)+'.rels'));for(const blip of blips){const image=resolve(name,drels,blip.getAttributeNS(R,'embed'),'image',/^xl\/media\/[^/]+$/);let anchor=blip;while(anchor&&!(anchor.namespaceURI===X&&['oneCellAnchor','twoCellAnchor','absoluteAnchor'].includes(anchor.localName)))anchor=anchor.parentNode;if(!anchor)throw Error('Excel图片锚点不受支持');const numeric=raw=>{if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)>2000000000)throw Error('Excel图片锚点无效');return Number(raw);};let position;if(anchor.localName==='absoluteAnchor'){const nodes=Array.from(anchor.getElementsByTagNameNS(X,'pos'));if(nodes.length!==1)throw Error('Excel图片锚点无效');position={kind:'absolute',x:numeric(nodes[0].getAttribute('x')),y:numeric(nodes[0].getAttribute('y'))};}else{const nodes=Array.from(anchor.getElementsByTagNameNS(X,'from'));if(nodes.length!==1)throw Error('Excel图片锚点无效');const get=k=>{const values=Array.from(nodes[0].getElementsByTagNameNS(X,k));if(values.length!==1)throw Error('Excel图片锚点无效');return numeric(values[0].textContent);};position={kind:'cell',col:get('col'),row:get('row'),x:get('colOff'),y:get('rowOff')};}
   // Size is comparable only for explicit extents or a two-cell anchor that
   // starts and ends in the same cell. Cross-cell geometry needs column/row
   // sizing and remains outside this bounded receipt.
   let size=null,endPosition=null;
   if(['oneCellAnchor','absoluteAnchor'].includes(anchor.localName)){
    const ext=Array.from(anchor.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===X&&n.localName==='ext');
    if(ext.length!==1)throw Error('Excel图片尺寸无效');size={w:numeric(ext[0].getAttribute('cx')),h:numeric(ext[0].getAttribute('cy'))};
   }else{
    const end=Array.from(anchor.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===X&&n.localName==='to');if(end.length!==1)throw Error('Excel图片锚点无效');
    const get=k=>{const nodes=Array.from(end[0].getElementsByTagNameNS(X,k));if(nodes.length!==1)throw Error('Excel图片锚点无效');return numeric(nodes[0].textContent);};
    const col=get('col'),row=get('row'),x=get('colOff'),y=get('rowOff');endPosition={col,row,x,y};if(col===position.col&&row===position.row){if(x<position.x||y<position.y)throw Error('Excel图片尺寸无效');size={w:x-position.x,h:y-position.y};}
   }
   let fill=blip.parentNode;while(fill&&fill.localName!=='blipFill')fill=fill.parentNode;if(!fill||![A,X].includes(fill.namespaceURI))throw Error('Excel图片填充结构无效');
   const crops=Array.from(fill.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===A&&n.localName==='srcRect');if(crops.length>1)throw Error('Excel图片裁剪重复');const crop=['l','t','r','b'].map(k=>{const raw=crops[0]?.getAttribute(k);if(raw==null||raw==='')return 0;if(!/^-?\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Math.abs(Number(raw))>1000000)throw Error('Excel图片裁剪无效');return Number(raw);});
   let picture=blip;while(picture&&!(picture.namespaceURI===X&&picture.localName==='pic'))picture=picture.parentNode;if(!picture)throw Error('Excel图片形状不受支持');
   const props=Array.from(picture.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===X&&n.localName==='spPr');if(props.length!==1)throw Error('Excel图片形状无效');const transforms=Array.from(props[0].childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===A&&n.localName==='xfrm');if(transforms.length>1)throw Error('Excel图片变换重复');
   const flip=k=>{const v=transforms[0]?.getAttribute(k);if(v==null||v===''||v==='0'||v==='false')return false;if(v==='1'||v==='true')return true;throw Error('Excel图片翻转无效');};const rawRotation=transforms[0]?.getAttribute('rot')||'0';if(!/^-?\d+$/.test(rawRotation)||!Number.isSafeInteger(Number(rawRotation))||Math.abs(Number(rawRotation))>21600000)throw Error('Excel图片旋转无效');const transform={rotation:Number(rawRotation),flipH:flip('flipH'),flipV:flip('flipV')};
   hashes.push({hash:createHash('sha256').update(files[image]).digest('hex'),position,size,endPosition,crop,transform});}}
   return hashes;
  });
 };
 const originalPlacements=placements(before);
 return output=>{if(JSON.stringify(workbookOutside(output,cells,preserveTarget))!==original)throw Error('Excel'+(preserveTarget?'单元格':'选区外的单元格')+'或公式发生变化，未发布新版本');if(JSON.stringify(media(output))!==originalMedia)throw Error('Excel图片内容发生变化，未发布新版本');const after=placements(output);if(after.length!==originalPlacements.length)throw Error('Excel工作表图片引用发生变化，未发布新版本');for(let i=0;i<after.length;i++){if(after[i].length!==originalPlacements[i].length)throw Error('Excel工作表图片引用发生变化，未发布新版本');for(let j=0;j<after[i].length;j++){const a=originalPlacements[i][j],b=after[i][j];if(a.hash!==b.hash)throw Error('Excel工作表图片引用发生变化，未发布新版本');if(JSON.stringify(a.crop)!==JSON.stringify(b.crop))throw Error('Excel图片裁剪发生变化，未发布新版本');if(JSON.stringify(a.transform)!==JSON.stringify(b.transform))throw Error('Excel图片旋转或翻转发生变化，未发布新版本');if(a.position.kind!==b.position.kind||a.position.col!==b.position.col||a.position.row!==b.position.row||Math.abs(a.position.x-b.position.x)>720||Math.abs(a.position.y-b.position.y)>720)throw Error('Excel图片起始位置发生变化，未发布新版本');if(a.size&&(!b.size||Math.abs(a.size.w-b.size.w)>720||Math.abs(a.size.h-b.size.h)>720))throw Error('Excel图片尺寸发生变化或无法核验，未发布新版本');if(a.endPosition&&b.endPosition&&(a.endPosition.col!==b.endPosition.col||a.endPosition.row!==b.endPosition.row||Math.abs(a.endPosition.x-b.endPosition.x)>720||Math.abs(a.endPosition.y-b.endPosition.y)>720))throw Error('Excel图片终点位置发生变化，未发布新版本');if(a.endPosition&&!b.endPosition&&(!a.size||!b.size))throw Error('Excel图片终点位置无法核验，未发布新版本');}}};
}
export function cellUpdateVerifier(before,cells,values){
 const verifyOther=workbookContentsVerifier(before,cells);
 return output=>{verifyCellsOutput(output,cells,values);verifyOther(output);};
}
/** Read the real saved XLSX before publishing; reject silent native no-ops/formulas/typed coercion mismatches. */
export function verifyCellsOutput(bytes,cells,values){
 const files=office.zip.unzipSync(bytes),S='http://schemas.openxmlformats.org/spreadsheetml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const parse=name=>{if(!files[name])throw Error('Excel输出缺少工作表部件');return new office.DOMParser({onError:()=>{throw Error('Excel输出XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files[name]),'application/xml');};
 const nodes=(n,name)=>Array.from(n.getElementsByTagNameNS(S,name)),sheet=nodes(parse('xl/workbook.xml'),'sheet')[cells.part];if(!sheet)throw Error('原生工作表已变化');
 const rels=Array.from(parse('xl/_rels/workbook.xml.rels').getElementsByTagNameNS('*','Relationship')),rel=rels.find(x=>x.getAttribute('Id')===sheet.getAttributeNS(R,'id'));if(!rel||rel.getAttribute('TargetMode')==='External'||!/\/worksheet$/.test(rel.getAttribute('Type')))throw Error('Excel工作表关系无效');
 const target=rel.getAttribute('Target'),file=target.startsWith('/')?target.slice(1):path.posix.normalize(path.posix.join('xl',target));if(!/^xl\/worksheets\/[^/]+\.xml$/.test(file))throw Error('Excel工作表路径无效');
 const cellsByRef=new Map(nodes(parse(file),'c').map(x=>[x.getAttribute('r'),x])),strings=files['xl/sharedStrings.xml']?nodes(parse('xl/sharedStrings.xml'),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join('')):[],m=cells.ref.match(/^([A-Z]+)([0-9]+)/),left=[...m[1]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),top=+m[2];
 const col=n=>{let out='';while(n){const k=(n-1)%26;out=String.fromCharCode(65+k)+out;n=Math.floor((n-1)/26);}return out;};
 for(let y=0;y<values.length;y++)for(let x=0;x<values[y].length;x++){
  const c=cellsByRef.get(col(left+x)+(top+y)),input=values[y][x],literal=input!==null&&typeof input==='object',expected=literal?input.text:input;if(c&&nodes(c,'f').length)throw Error('原生输出含目标公式，未发布');
  const type=c?.getAttribute('t'),raw=c?nodes(c,'v')[0]?.textContent||'':'',actual=type==='s'?strings[Number(raw)]:type==='inlineStr'?nodes(c,'t').map(t=>t.textContent).join(''):type==='b'?(raw==='1'?'TRUE':'FALSE'):raw;
  if(literal){if(expected===''&&actual==='')continue;if(!['s','inlineStr'].includes(type)||actual!==expected)throw Error('原生文本单元格'+col(left+x)+(top+y)+'类型或值不一致，保留草稿未发布');continue;}
  const numeric=/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(expected);
  if(actual!==expected&&!(numeric&&(!type||type==='n')&&raw!==''&&exactDecimal(raw)===exactDecimal(expected)))throw Error('原生单元格输出与要求不一致，保留草稿未发布');
 }
 return true;
}
