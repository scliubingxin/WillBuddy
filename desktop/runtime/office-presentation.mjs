import path from 'node:path';
import {createHash} from 'node:crypto';
import office from './vendor/office.cjs';
const P='http://schemas.openxmlformats.org/presentationml/2006/main',A='http://schemas.openxmlformats.org/drawingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const all=(n,ns,name)=>Array.from(n.getElementsByTagNameNS(ns,name));
const children=(n,name)=>Array.from(n?.childNodes||[]).filter(x=>x.nodeType===1&&x.namespaceURI===A&&(!name||x.localName===name));
function directStyle(node){
 const result={};if(!node)return result;
 for(const key of ['sz','b','i','u','strike','baseline','spc'])if(node.hasAttribute(key)){
  let v=node.getAttribute(key);if(['b','i'].includes(key)){if(!['0','1','true','false'].includes(v))throw Error('PPT文字格式布尔值无效');v=['1','true'].includes(v)?'1':'0';}
  else if(['sz','baseline','spc'].includes(key)){if(!/^-?\d+$/.test(v))throw Error('PPT文字格式数字无效');if(!Number.isSafeInteger(Number(v)))throw Error('PPT文字格式数字超限');v=String(Number(v));}result[key]=v;
 }
 for(const key of ['latin','ea','cs']){const nodes=children(node,key);if(nodes.length>1)throw Error('PPT文字字体重复');const font=nodes[0]?.getAttribute('typeface');if(font&&!font.startsWith('+'))result[key]=font;}
 const fills=children(node,'solidFill');if(fills.length>1)throw Error('PPT文字颜色重复');const rgb=fills[0]&&children(fills[0],'srgbClr');if(rgb?.length===1&&!Array.from(rgb[0].childNodes).some(n=>n.nodeType===1)){const v=rgb[0].getAttribute('val');if(!/^[0-9a-fA-F]{6}$/.test(v))throw Error('PPT文字颜色无效');result.color=v.toUpperCase();}return result;
}
function paragraphStyle(p){
 const ppr=children(p,'pPr');if(ppr.length>1)throw Error('PPT段落属性重复');const lists=children(p.parentNode,'lstStyle'),level=Number(ppr[0]?.getAttribute('lvl')||0);if(!Number.isInteger(level)||level<0||level>8)throw Error('PPT段落层级无效');
 if(lists.length>1||children(ppr[0],'defRPr').length>1)throw Error('PPT默认文字格式重复');const levels=lists[0]?children(lists[0],'lvl'+(level+1)+'pPr'):[];if(levels.length>1||children(levels[0],'defRPr').length>1)throw Error('PPT层级文字格式重复');
 const inherited=levels[0],base={...directStyle(inherited&&children(inherited,'defRPr')[0]),...directStyle(ppr[0]&&children(ppr[0],'defRPr')[0])};
 const spans=[];for(const run of children(p,'r')){const props=children(run,'rPr');if(props.length>1)throw Error('PPT文字属性重复');spans.push({text:children(run,'t').map(t=>t.textContent).join(''),style:{...base,...directStyle(props[0])}});}return {spans,align:ppr[0]?.getAttribute('algn')||inherited?.getAttribute('algn')||null};
}
function safeTarget(shape){
 for(const p of all(shape,A,'p')){
  if(Array.from(p.childNodes).some(n=>n.nodeType===1&&(n.namespaceURI!==A||!['pPr','r','endParaRPr'].includes(n.localName))))return false;
  for(const r of children(p,'r'))if(Array.from(r.childNodes).some(n=>n.nodeType===1&&(n.namespaceURI!==A||!['rPr','t'].includes(n.localName))))return false;
 }
 const allowed=new Set(['sz','b','i','u','strike','baseline','spc','lang','altLang','dirty','err','smtClean','smtId','bmk']);
 for(const name of ['rPr','defRPr'])for(const pr of all(shape,A,name)){
  if(Array.from(pr.attributes||[]).some(a=>a.namespaceURI!=='http://www.w3.org/2000/xmlns/'&&(!!a.namespaceURI||!allowed.has(a.localName))))return false;
  if(Array.from(pr.childNodes).some(n=>n.nodeType===1&&(n.namespaceURI!==A||!['solidFill','latin','ea','cs'].includes(n.localName))))return false;
  for(const name of ['latin','ea','cs'])if(children(pr,name).some(n=>(n.getAttribute('typeface')||'').startsWith('+')))return false;
  for(const fill of children(pr,'solidFill')){const rgb=children(fill,'srgbClr');if(rgb.length!==1||Array.from(rgb[0].childNodes).some(n=>n.nodeType===1))return false;}
 }
 return true;
}
function formatReceipt(before,after){
 if(before.align&&before.align!==after.align)throw Error('PPT保存段落对齐与原文不一致，未发布新版本');
 const flatten=p=>p.spans.flatMap(s=>Array.from({length:s.text.length},()=>s.style)),a=flatten(before),b=flatten(after);if(a.length!==b.length)throw Error('PPT保存格式坐标与文字不一致');
 const value=before.spans.map(s=>s.text).join('');
 for(let i=0;i<a.length;i++)for(const[k,v]of Object.entries(a[i])){const ch=value[i];if(k==='cs'&&!/[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(ch)||k==='ea'&&!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(ch)||k==='latin'&&!/[\p{Script=Latin}\u0000-\u007f]/u.test(ch))continue;if(b[i]?.[k]!==v)throw Error('PPT保存文字格式与原文不一致（'+k+'），未发布新版本');}
}
// Preserve explicit shape placement; inherited placeholder geometry has no local
// transform and is intentionally left to the master/layout rather than guessed.
function placement(shape){
 const spPr=Array.from(shape.childNodes||[]).find(n=>n.nodeType===1&&n.namespaceURI===P&&n.localName==='spPr');
 const transforms=children(spPr,'xfrm');if(transforms.length>1)throw Error('PPT形状位置重复');
 if(!transforms.length)return null;
 const t=transforms[0],off=children(t,'off'),ext=children(t,'ext');if(off.length!==1||ext.length!==1)throw Error('PPT形状位置不完整');
 const read=(node,name,def)=>{const v=node.getAttribute(name);if(v===null||v==='')return def;if(!/^-?\d+$/.test(v)||!Number.isSafeInteger(Number(v)))throw Error('PPT形状位置无效');return String(Number(v));};
 const flip=name=>{const v=t.getAttribute(name);if(v===''||v===null||v==='0'||v==='false')return '0';if(v==='1'||v==='true')return '1';throw Error('PPT形状翻转值无效');};
 return {x:read(off[0],'x',null),y:read(off[0],'y',null),cx:read(ext[0],'cx',null),cy:read(ext[0],'cy',null),rot:read(t,'rot','0'),flipH:flip('flipH'),flipV:flip('flipV')};
}
function samePlacement(a,b){if(!b)return false;return ['x','y','cx','cy'].every(k=>a[k]!==null&&b[k]!==null&&Math.abs(Number(a[k])-Number(b[k]))<=720)&&['rot','flipH','flipV'].every(k=>a[k]===b[k]);}
// Preserve the explicit source crop of a top-level picture. Missing values
// have the OOXML default of zero; no assumptions about inherited effects.
function pictureCrop(shape){
 const fills=Array.from(shape.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===P&&n.localName==='blipFill');
 if(fills.length!==1)throw Error('PPT图片填充结构无效');
 const crops=children(fills[0],'srcRect');if(crops.length>1)throw Error('PPT图片裁剪重复');
 return ['l','t','r','b'].map(k=>{const raw=crops[0]?.getAttribute(k);if(raw==null||raw==='')return '0';if(!/^-?\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Math.abs(Number(raw))>1000000)throw Error('PPT图片裁剪值不受支持');return String(Number(raw));});
}
function deck(bytes){
 const files=office.zip.unzipSync(bytes),parse=file=>{if(!files[file])throw Error('PPT文字验收缺少部件');return new office.DOMParser({onError:()=>{throw Error('PPT文字验收XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files[file]),'application/xml');};
 const refs=all(parse('ppt/presentation.xml'),P,'sldId'),rels=all(parse('ppt/_rels/presentation.xml.rels'),'*','Relationship');if(!refs.length||refs.length>50)throw Error('PPT文字编辑限50页');let count=0,total=0;
 const seenRefs=new Set(),seenSlides=new Set();
 return refs.map(ref=>{
  const id=ref.getAttributeNS(R,'id');if(!id||seenRefs.has(id))throw Error('PPT页面引用缺失或重复');seenRefs.add(id);
  const matches=rels.filter(r=>r.getAttribute('Id')===id);if(matches.length!==1)throw Error('PPT页面关系无效或重复');const rel=matches[0];if(rel.getAttribute('TargetMode')==='External'||!rel.getAttribute('Type').endsWith('/slide'))throw Error('PPT页面关系无效');const target=rel.getAttribute('Target');if(!target)throw Error('PPT页面路径无效');const file=target.startsWith('/')?target.slice(1):path.posix.normalize(path.posix.join('ppt',target));if(!/^ppt\/slides\/[^/]+\.xml$/.test(file)||seenSlides.has(file))throw Error('PPT页面路径无效或重复');seenSlides.add(file);
  const xml=parse(file),ids=new Set(),shapes=[];
  let imageRels;
  function pictureDigest(shape){
   const blips=all(shape,A,'blip');if(blips.length!==1)throw Error('PPT图片引用不受支持');
   const id=blips[0].getAttributeNS(R,'embed');if(!id||blips[0].getAttributeNS(R,'link'))throw Error('PPT图片必须是内部资源');
   if(!imageRels)imageRels=all(parse(path.posix.join(path.posix.dirname(file),'_rels',path.posix.basename(file)+'.rels')),'*','Relationship');
   const matches=imageRels.filter(r=>r.getAttribute('Id')===id);if(matches.length!==1)throw Error('PPT图片关系无效或重复');
   const rel=matches[0],target=rel.getAttribute('Target');if(rel.getAttribute('TargetMode')==='External'||!rel.getAttribute('Type').endsWith('/image')||!target)throw Error('PPT图片关系不受支持');
   const resolved=target.startsWith('/')?path.posix.normalize(target.slice(1)):path.posix.normalize(path.posix.join(path.posix.dirname(file),target));
   if(!/^ppt\/media\/[^/]+$/.test(resolved)||!files[resolved])throw Error('PPT图片资源不存在或路径无效');
   return createHash('sha256').update(files[resolved]).digest('hex');
  }
  // Validate IDs on each read; LibreOffice renumbers them on export. Compare ordered shape kinds and paragraphs, not run offsets or generated IDs.
  for(const n of all(xml,P,'cNvPr')){
   if(++count>2000)throw Error('PPT文字验收形状超限');const id=n.getAttribute('id');if(!/^\d+$/.test(id)||ids.has(id))throw Error('PPT形状标识无效或重复');ids.add(id);
   const shape=n.parentNode.parentNode,kind=shape.localName;if(!['sp','pic','graphicFrame','cxnSp','grpSp','spTree'].includes(kind))throw Error('PPT形状结构不支持');
   if(kind==='spTree')continue;
   if(kind==='grpSp'){shapes.push({id,kind,paragraphs:[],formats:[],simple:false});continue;}
   const nodes=all(shape,A,'p'),paragraphs=nodes.map(p=>all(p,A,'t').map(t=>t.textContent).join('')),formats=nodes.map(paragraphStyle);total+=paragraphs.join('\n').length;if(total>100000)throw Error('PPT文字验收限10万字符');
   const simple=kind==='sp'&&shape.parentNode.localName==='spTree'&&safeTarget(shape)&&paragraphs.length>=1&&!all(shape,A,'fld').length&&!all(shape,A,'br').length&&!all(shape,A,'hlinkClick').length&&!all(shape,A,'hlinkMouseOver').length;
   shapes.push({id,kind,paragraphs,formats,simple,placement:['sp','pic'].includes(kind)?placement(shape):null,picture:kind==='pic'?pictureDigest(shape):null,crop:kind==='pic'?pictureCrop(shape):null});
  }
  return shapes;
 });
}
function presentationVerifier(bytes,part,selection,text,format,maxText=600,allowEmpty=false){
 if(!Number.isInteger(part)||part<0||part>=50||typeof selection!=='string'||!selection||selection.length>12000||typeof text!=='string'||(!text&&!allowEmpty)||text.length>(format?12000:maxText)||/[\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(selection+text))throw Error('PPT选区编辑仅支持有界单行文字');
 const before=deck(bytes),slide=before[part];if(!slide)throw Error('PPT页码无效');const matches=[];
 for(let i=0;i<slide.length;i++)for(let j=0;j<slide[i].paragraphs.length;j++){
  const value=slide[i].paragraphs[j];let at=value.indexOf(selection);while(at>=0){matches.push([i,j,at]);at=value.indexOf(selection,at+1);}
 }
 if(matches.length!==1)throw Error('PPT选区文字在当前页无法唯一对应，请选择更完整文字');const [index,paragraph,offset]=matches[0];if(!slide[index].simple)throw Error('PPT目前仅修改普通文本框内同一段文字，不支持表格、分组、域、链接或复杂文字格式');
 const expected=structuredClone(before),source=slide[index].formats[paragraph],chars=source.spans.flatMap(s=>Array.from({length:s.text.length},()=>s.style)),selected=chars.slice(offset,offset+selection.length);
 if(chars.length!==slide[index].paragraphs[paragraph].length||selected.length!==selection.length)throw Error('PPT选区包含不支持的复杂文字');
 const signature=x=>JSON.stringify(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)));if(selected.some(x=>signature(x)!==signature(selected[0])))throw Error('PPT选区含混合直接格式，请缩小到同一格式文字');
 const styles=[...chars.slice(0,offset),...Array.from({length:text.length},()=>({...selected[0],...format})),...chars.slice(offset+selection.length)],value=slide[index].paragraphs[paragraph].slice(0,offset)+text+slide[index].paragraphs[paragraph].slice(offset+selection.length);
 expected[part][index].formats[paragraph]={align:source.align,spans:styles.map((style,i)=>({text:value[i],style}))};expected[part][index].paragraphs[paragraph]=slide[index].paragraphs[paragraph].slice(0,offset)+text+slide[index].paragraphs[paragraph].slice(offset+selection.length);
 const semantic=v=>v.map(s=>s.map(({kind,paragraphs})=>({kind,paragraphs})));
 return output=>{const actual=deck(output);if(JSON.stringify(semantic(actual))!==JSON.stringify(semantic(expected)))throw Error('PPT保存文字与批准修改不一致，未发布新版本');for(let p=0;p<expected.length;p++)for(let s=0;s<expected[p].length;s++){if(expected[p][s].picture&&expected[p][s].picture!==actual[p][s].picture)throw Error('PPT保存图片内容与原文不一致，未发布新版本');if(expected[p][s].crop&&JSON.stringify(expected[p][s].crop)!==JSON.stringify(actual[p][s].crop))throw Error('PPT保存图片裁剪与原文不一致，未发布新版本');if(expected[p][s].placement&&!samePlacement(expected[p][s].placement,actual[p][s].placement))throw Error('PPT保存形状位置与原文不一致，未发布新版本');for(let j=0;expected[p][s].simple&&j<expected[p][s].formats.length;j++)formatReceipt(expected[p][s].formats[j],actual[p][s].formats[j]);}};
}

export function presentationTextVerifier(bytes,part,selection,text,{manual=false}={}){return presentationVerifier(bytes,part,selection,text,undefined,manual?4000:600,manual);}
export function normalizePresentationFormat(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['fontSize','fontColor'].includes(k)))throw Error('PPT仅支持字号和文字颜色');
 const data={};
 if(p.fontSize!==undefined){if(typeof p.fontSize!=='number'||!Number.isFinite(p.fontSize)||p.fontSize<6||p.fontSize>96||!Number.isInteger(p.fontSize*2))throw Error('PPT字号限6–96pt，步长0.5pt');data.fontSize=p.fontSize;}
 if(p.fontColor!==undefined){if(typeof p.fontColor!=='string'||!/^#[0-9a-fA-F]{6}$/.test(p.fontColor))throw Error('PPT文字颜色须为#RRGGBB');data.fontColor=p.fontColor.toUpperCase();}
 if(!Object.keys(data).length)throw Error('请指定PPT字号或文字颜色');return data;
}
export function presentationFormatVerifier(bytes,part,selection,properties){const data=normalizePresentationFormat(properties),format={};if(data.fontSize!==undefined)format.sz=String(data.fontSize*100);if(data.fontColor!==undefined)format.color=data.fontColor.slice(1);return presentationVerifier(bytes,part,selection,selection,format);}
export const officePresentationFormatDefinition={type:'function',function:{name:'office_format_presentation',description:'经逐次批准设置当前PPT唯一普通文本框中同一段的同格式文字选区的字号fontSize或文字颜色fontColor，不改文字；每任务与其他修改共用一次额度。须先双击进入文字编辑并选择文字。仅6–96pt半点步长、#RRGGBB颜色；不支持混合格式/分组/表格/域/链接/复杂效果，不修改主题或母版。保存后核验实际PPTX，失败不发布。',parameters:{type:'object',properties:{fontSize:{type:'number',minimum:6,maximum:96},fontColor:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'}},additionalProperties:false}}};
