/** Bounded structural OOXML patch. No native UNO grid success is assumed. */
import office from './vendor/office.cjs';
import {inspectDocument,openPackage,sha256} from './documents.mjs';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const all=(n,name)=>Array.from(n.getElementsByTagNameNS(W,name));
const elements=n=>Array.from(n?.childNodes||[]).filter(x=>x.nodeType===1);
const children=(n,name)=>Array.from(n?.childNodes||[]).filter(x=>x.nodeType===1&&x.namespaceURI===W&&(!name||x.localName===name));
const serialize=n=>new office.XMLSerializer().serializeToString(n);
export function normalizeTableGrid(p){
 if(!p||Object.keys(p).some(k=>!['color','width','edges'].includes(k))||typeof p.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(p.color))throw Error('网格颜色须为#RRGGBB');
 if(typeof p.width!=='number'||!Number.isFinite(p.width)||p.width<0.5||p.width>3||!Number.isInteger(p.width*4))throw Error('网格线宽限0.5–3pt，步长0.25pt');
 const order=['top','start','bottom','end'];
 if(p.edges!==undefined&&(!Array.isArray(p.edges)||p.edges.length<1||p.edges.length>4||new Set(p.edges).size!==p.edges.length||Array.from(p.edges).some(e=>!order.includes(e))))throw Error('指定外边须为top/start/bottom/end的非空不重复数组');
 return {color:p.color.toUpperCase(),width:p.width,...(p.edges===undefined?{}:{edges:order.filter(e=>p.edges.includes(e))})};
}
export function wordTableGridPlan(bytes,table,style){
 const grid=normalizeTableGrid(style);inspectDocument('docx',bytes);const files=openPackage(bytes);
 if(Object.keys(files).some(n=>n.toLowerCase().startsWith('_xmlsignatures/')))throw Error('带签名Word不支持网格修改');
 if(!table||!Number.isInteger(table.rows)||!Number.isInteger(table.columns)||table.rows<1||table.rows>30||table.columns<1||table.columns>16||table.rows*table.columns>200)throw Error('网格需要有界完整表格选区');
 const typeXML=new office.DOMParser({onError:()=>{throw Error('Word内容类型无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files['[Content_Types].xml']),'application/xml'),xmlType=t=>/(?:\+|\/)xml$/i.test(t||''),overrides=new Set(Array.from(typeXML.getElementsByTagNameNS('*','Override')).filter(n=>xmlType(n.getAttribute('ContentType'))).map(n=>n.getAttribute('PartName').replace(/^\//,''))),extensions=new Set(Array.from(typeXML.getElementsByTagNameNS('*','Default')).filter(n=>xmlType(n.getAttribute('ContentType'))).map(n=>n.getAttribute('Extension').toLowerCase()));
 for(const [name,part] of Object.entries(files)){if(name==='word/document.xml'||!(name.toLowerCase().endsWith('.xml')||overrides.has(name)||extensions.has(name.split('.').pop().toLowerCase())))continue;const other=new office.DOMParser({onError:()=>{throw Error('Word部件XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(part),'application/xml');if(all(other,'tbl').length)throw Error('网格要求整个Word包只有正文一份表格，页眉页脚等其他部件不能含表格');}
 const xml=new office.DOMParser({onError:()=>{throw Error('Word网格XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files['word/document.xml']),'application/xml');
 const body=all(xml,'body')[0],tables=all(xml,'tbl');if(tables.length!==1||tables[0].parentNode!==body)throw Error('网格仅支持正文唯一顶层表格，不支持多表或嵌套表格');
 const t=tables[0],rows=children(t,'tr');
 if(rows.length!==table.rows||rows.some(r=>children(r,'tc').length!==table.columns))throw Error('必须选中完整表格，不能扩大部分选区');
 if(all(t,'gridSpan').length||all(t,'vMerge').length||all(t,'hMerge').length||all(t,'gridBefore').length||all(t,'gridAfter').length)throw Error('网格不支持合并、跨列或不规则表格');
 if(['ins','del','moveFrom','moveTo','sdt','customXml','tblPrChange','tcPrChange','trPrChange','fldChar','instrText','hyperlink','drawing','pict','altChunk'].some(n=>all(t,n).length))throw Error('网格目标含复杂对象、修订、域或链接');
 // Row/cell style exceptions can override a border. Keep the bounded operation explicit.
 if(all(t,'tblPrEx').length||all(t,'tblCellSpacing').some(n=>n.getAttributeNS(W,'w')!=='0'))throw Error('网格暂不支持行属性例外或分离单元格间距');
 for(const r of rows)for(const c of children(r,'tc')){if(elements(c).some(n=>n.namespaceURI!==W||!['tcPr','p'].includes(n.localName)))throw Error('网格单元格含复杂结构');for(const p of children(c,'p')){if(elements(p).some(n=>n.namespaceURI!==W||!['pPr','r'].includes(n.localName)))throw Error('网格段落含复杂结构');for(const run of children(p,'r'))if(elements(run).some(n=>n.namespaceURI!==W||!['rPr','t'].includes(n.localName)))throw Error('网格文字含复杂结构');}}
 const create=name=>xml.createElementNS(W,'w:'+name),set=(n,key,value)=>n.setAttributeNS(W,'w:'+key,String(value));
 function property(parent,name){if(children(parent,name).length>1)throw Error('Word网格属性重复');let p=children(parent,name)[0];if(!p){p=create(name);parent.insertBefore(p,parent.firstChild);}return p;}
 function borders(parent,name,sides,replaceAll){
  const p=property(parent,name);
  if(replaceAll){for(const old of [...p.childNodes])p.removeChild(old);}
  // Logical start/end aliases must not conflict; unrelated sides remain verbatim.
  for(const side of sides){
   for(const old of elements(p))if(old.namespaceURI===W&&[side,...(side==='start'?['left']:side==='end'?['right']:[])].includes(old.localName))p.removeChild(old);
   const n=create(side);for(const [k,v] of Object.entries({val:'single',sz:grid.width*8,color:grid.color.slice(1),space:0}))set(n,k,v);p.appendChild(n);
  }
 }
 const edges=grid.edges;
 borders(property(t,'tblPr'),'tblBorders',edges||['top','start','bottom','end','insideH','insideV'],!edges);
 rows.forEach((row,y)=>children(row,'tc').forEach((cell,x)=>{
  const sides=edges?edges.filter(e=>e==='top'?y===0:e==='bottom'?y===rows.length-1:e==='start'?x===0:x===table.columns-1):['top','start','bottom','end'];
  if(sides.length)borders(property(cell,'tcPr'),'tcBorders',sides,!edges);
 }));
 files['word/document.xml']=new TextEncoder().encode(serialize(xml));const candidate=Buffer.from(office.zip.zipSync(files));inspectDocument('docx',candidate);
 const expected=Object.fromEntries(Object.entries(files).map(([k,b])=>[k,sha256(b)]));
 return {bytes:candidate,grid,verify(output){inspectDocument('docx',output);const actual=openPackage(output);if(JSON.stringify(Object.keys(actual).sort())!==JSON.stringify(Object.keys(expected).sort())||Object.entries(expected).some(([k,d])=>sha256(actual[k])!==d))throw Error('Word网格补丁部件与核验候选不一致');}};
}
export const officeTableGridDefinition={type:'function',function:{name:'office_table_grid',description:'经单独批准给Word正文唯一顶层、无合并表格的完整选区设置实线边框，保留文字和padding。省略edges设置全部网格（含内部横竖）；edges显式选择整表外边top/start/bottom/end（上/逻辑起边/下/逻辑止边），仅修改所选外围线，其他外边及内部线保留，不是每格同名边。仅有界OOXML补丁，自动重载原窗口并清空原生Undo/Redo栈，前版保留。不是任意子区域、多表、嵌套或复杂对象。每轮共用一次修改额度。',parameters:{type:'object',properties:{color:{type:'string',pattern:'^#[0-9A-Fa-f]{6}$'},width:{type:'number',minimum:0.5,maximum:3},edges:{type:'array',minItems:1,maxItems:4,uniqueItems:true,items:{type:'string',enum:['top','start','bottom','end']}}},required:['color','width'],additionalProperties:false}}};
