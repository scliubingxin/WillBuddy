import office from './vendor/office.cjs';
import path from 'node:path';
import {cellSelection} from './office-cells.mjs';
import {normalizeOfficeFormat} from './office-format.mjs';

export function normalizeCellFormat(value){
 if(!value||Array.isArray(value)||Object.keys(value).some(k=>!['fontSize','fontColor','backgroundColor','bold','italic'].includes(k)))throw Error('Excel格式仅支持字号、文字色、底色、粗体和斜体');
 const {bold,italic,...base}=value,out=Object.keys(base).length?normalizeOfficeFormat(base):{};
 for(const [key,v] of Object.entries({bold,italic}))if(v!==undefined){if(typeof v!=='boolean')throw Error('粗体和斜体必须为布尔值');out[key]=v;}
 if(!Object.keys(out).length)throw Error('请指定单元格格式');return out;
}
const S='http://schemas.openxmlformats.org/spreadsheetml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const nodes=(n,name)=>Array.from(n.getElementsByTagNameNS(S,name));
// Exact decimal semantics, without IEEE-754 rounding collisions during preservation checks.
function decimal(raw){
 const m=/^([+-]?)([0-9]+)(?:\.([0-9]*))?(?:[eE]([+-]?[0-9]+))?$/.exec(raw);if(!m||raw.length>1000||Math.abs(Number(m[4]||0))>10000)throw Error('数值格式验收超限或无效');
 let digits=(m[2]+(m[3]||'')).replace(/^0+/,'');if(!digits)return '0';let power=Number(m[4]||0)-(m[3]||'').length;while(digits.endsWith('0')){digits=digits.slice(0,-1);power++;}return (m[1]==='-'?'-':'')+digits+'e'+power;
}
function readWorkbook(bytes){
 const files=office.zip.unzipSync(bytes),parse=name=>{if(!files[name])throw Error('Excel格式验收缺少部件');return new office.DOMParser({onError:()=>{throw Error('Excel格式验收XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files[name]),'application/xml');};
 const sheets=nodes(parse('xl/workbook.xml'),'sheet');if(!sheets.length||sheets.length>10)throw Error('格式编辑限10张工作表');
 const rels=Array.from(parse('xl/_rels/workbook.xml.rels').getElementsByTagNameNS('*','Relationship')),stringNodes=files['xl/sharedStrings.xml']?nodes(parse('xl/sharedStrings.xml'),'si'):[],strings=stringNodes.map(n=>nodes(n,'t').map(t=>t.textContent).join(''));
 let count=0;const content=[],parts=[],richParts=[],conditionalParts=[];
 for(const sheet of sheets){
  const rel=rels.find(n=>n.getAttribute('Id')===sheet.getAttributeNS(R,'id'));if(!rel||rel.getAttribute('TargetMode')==='External'||!/\/worksheet$/.test(rel.getAttribute('Type')))throw Error('工作表关系无效');
  const target=rel.getAttribute('Target'),file=target.startsWith('/')?target.slice(1):path.posix.normalize(path.posix.join('xl',target));if(!/^xl\/worksheets\/[^/]+\.xml$/.test(file))throw Error('工作表路径无效');
  const sheetDoc=parse(file),cells=new Map(),values=[],rich=new Set();conditionalParts.push(nodes(sheetDoc,'conditionalFormatting').length>0);
  for(const c of nodes(sheetDoc,'c')){
   if(++count>5000)throw Error('格式编辑验收限工作簿5000个已存储单元格');const ref=c.getAttribute('r');if(!/^[A-Z]{1,3}[1-9][0-9]{0,6}$/.test(ref)||cells.has(ref))throw Error('单元格地址重复或无效');cells.set(ref,c);
   const fs=nodes(c,'f'),type=c.getAttribute('t'),raw=nodes(c,'v')[0]?.textContent||'';let v;
   if(nodes(c,'r').length||type==='s'&&stringNodes[Number(raw)]&&nodes(stringNodes[Number(raw)],'r').length)rich.add(ref);
   if(fs.length){if(fs.length!==1||fs[0].getAttribute('t')&&fs[0].getAttribute('t')!=='normal')throw Error('格式编辑暂不支持共享或数组公式');v=['formula',fs[0].textContent];}
   else if(type==='s'){if(!/^\d+$/.test(raw)||strings[Number(raw)]===undefined)throw Error('共享字符串无效');v=['text',strings[Number(raw)]];}
   else if(type==='inlineStr')v=['text',nodes(c,'t').map(n=>n.textContent).join('')];
   else if(type==='b')v=['bool',raw];else if(type==='e')v=['error',raw];
   else if(!type||type==='n'){v=raw===''?['text','']:['number',decimal(raw)];}
   else throw Error('格式编辑暂不支持此单元格类型');
   if(v[0]!=='text'||v[1]!=='')values.push([ref,...v]);
  }
  values.sort((a,b)=>a[0].localeCompare(b[0],'en'));content.push([sheet.getAttribute('name'),values]);parts.push(cells);richParts.push(rich);
 }
 return {content,parts,richParts,conditionalParts,styles:()=>parse('xl/styles.xml')};
}
/** A pre-mutation semantic receipt; no extra model reads or arbitrary commands. */
export function cellFormatVerifier(original,cells,format){
 const range=cellSelection(cells),receipt=readWorkbook(original),before=receipt.content,expected=normalizeCellFormat(format);if(!before[cells.part])throw Error('工作表已变化');
 if(receipt.conditionalParts[cells.part])throw Error('此工作表含条件格式，暂不支持AI格式修改');
 const target=range.ref.match(/^([A-Z]+)([0-9]+)/),x0=[...target[1]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),y0=+target[2];
 for(const ref of receipt.richParts[cells.part]){const m=ref.match(/^([A-Z]+)([0-9]+)/),x=[...m[1]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),y=+m[2];if(x>=x0&&x<x0+range.columns&&y>=y0&&y<y0+range.rows)throw Error('当前区域含段内富文本格式，暂不支持AI格式修改');}
 return bytes=>{
  const after=readWorkbook(bytes);if(after.conditionalParts[cells.part])throw Error('Excel输出含条件格式，未发布');if(JSON.stringify(after.content)!==JSON.stringify(before))throw Error('Excel格式操作改变了数据或公式，保留草稿未发布');
  const styles=after.styles(),fonts=nodes(styles,'fonts')[0],fills=nodes(styles,'fills')[0],xfs=nodes(styles,'cellXfs')[0];if(!fonts||!fills||!xfs)throw Error('Excel格式输出缺少样式');
  const fontList=Array.from(fonts.childNodes).filter(n=>n.localName==='font'),fillList=Array.from(fills.childNodes).filter(n=>n.localName==='fill'),styleList=Array.from(xfs.childNodes).filter(n=>n.localName==='xf');
  const m=range.ref.match(/^([A-Z]+)([0-9]+)/),left=[...m[1]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),top=+m[2],col=n=>{let s='';while(n){const k=(n-1)%26;s=String.fromCharCode(65+k)+s;n=Math.floor((n-1)/26);}return s;};
  const rgb=(n,key)=>{const color=nodes(n,key)[0],value=color?.getAttribute('rgb');return color&&!color.hasAttribute('theme')&&!color.hasAttribute('indexed')&&(!color.hasAttribute('tint')||Number(color.getAttribute('tint'))===0)&&/^[0-9A-Fa-f]{8}$/.test(value||'')?'#'+value.slice(-6).toUpperCase():null;};
  for(let y=0;y<range.rows;y++)for(let x=0;x<range.columns;x++){
   const ref=col(left+x)+(top+y);if(after.richParts[cells.part].has(ref))throw Error('Excel目标输出含段内富文本格式，未发布');
   const c=after.parts[cells.part].get(ref),xf=styleList[Number(c?.getAttribute('s')||0)],font=fontList[Number(xf?.getAttribute('fontId')||0)],fill=fillList[Number(xf?.getAttribute('fillId')||0)];if(!c||!xf||!font||!fill)throw Error('Excel目标格式缺失');
   if(expected.fontSize!==undefined&&Number(nodes(font,'sz')[0]?.getAttribute('val'))!==expected.fontSize)throw Error('Excel目标字号未生效');
   if(expected.fontColor!==undefined&&rgb(font,'color')!==expected.fontColor)throw Error('Excel目标文字颜色未生效');
   if(expected.backgroundColor!==undefined&&(nodes(fill,'patternFill')[0]?.getAttribute('patternType')!=='solid'||rgb(fill,'fgColor')!==expected.backgroundColor))throw Error('Excel目标底色未生效');
   for(const [key,tag] of [['bold','b'],['italic','i']])if(expected[key]!==undefined){const n=nodes(font,tag)[0],actual=!!n&&!['0','false'].includes((n.getAttribute('val')||'1').toLowerCase());if(actual!==expected[key])throw Error('Excel目标'+key+'格式未生效');}
  }
  return true;
 };
}
export const officeCellFormatDefinition={type:'function',function:{name:'office_format_cells',description:'经单独批准修改Excel当前已定位矩形选区的字号、文字颜色、纯色底色、粗体和斜体。bold/italic使用布尔值；fontSize为6–96pt半点步长，颜色#RRGGBB；不替换数据或公式。保存前核验真实XLSX目标格式和工作簿单元格数据/公式未变；不保证任意复杂格式无损。最多30行16列200格，工作簿最多10表5000已存储格；不支持合并区域、共享/数组公式或跨表选区。与其他修改共用一次额度。',parameters:{type:'object',properties:{fontSize:{type:'number',minimum:6,maximum:96},fontColor:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},backgroundColor:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},bold:{type:'boolean'},italic:{type:'boolean'}},additionalProperties:false}}};

/** Exact content semantics shared by native formatting and formula receipts. */
export function workbookContentSnapshot(bytes){return readWorkbook(bytes).content;}
