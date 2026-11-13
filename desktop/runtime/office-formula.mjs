/** Native single-cell formulas: bounded pure preflight + real XLSX receipt. */
import office from './vendor/office.cjs';
import {parseFormula,calculateWorkbook,cellAddress,formulaFunctions} from '../src/shared/formula-core.js';
import {workbookModel} from './spreadsheet.mjs';
import {workbookContentSnapshot} from './office-cell-format.mjs';
import {cellSelection} from './office-cells.mjs';
export function nativeFormula(value){
 if(typeof value!=='string'||!value||value.length>400||!/^[\x20-\x7e]+$/.test(value))throw Error('原生公式限400个ASCII字符');
 const source=value.trim().replace(/^=/,'').replace(/\s+/g,'').toUpperCase();
 if(!source||/[!"'\[\]{};@#_\\]/.test(source))throw Error('仅支持同表算术、A1引用和七种函数，不接受外部或跨表公式');
 const tokens=source.match(/(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:E[+-]?[0-9]+)?|\$?[A-Z]{1,2}\$?[1-9][0-9]{0,3}|[A-Z]+|[()+*/^%,:<>=-]/g)||[];if(tokens.join('')!==source||tokens.length>200)throw Error('公式符号预算或语法超限');
 const ast=parseFormula(source);let refs=0;
 function walk(n){
  if(n.type==='value'&&typeof n.value==='number'&&Math.abs(n.value)>Number.MAX_SAFE_INTEGER)throw Error('公式数值字面量超安全量级');
  if(n.type==='ref'||n.type==='range'){
   if(n.sheet!==undefined)throw Error('公式不支持跨表');const a=n.type==='ref'?cellAddress(n.address):n.from,b=n.type==='ref'?a:n.to;
   if(Math.max(a.col,b.col)>128||Math.max(a.row,b.row)>5000)throw Error('公式引用限128列5000行');refs+=(b.col-a.col+1)*(b.row-a.row+1);if(refs>10000)throw Error('公式引用累计超10000格');
  }
  if(n.fn&&!formulaFunctions.includes(n.fn))throw Error('公式函数不支持');
  if(n.arg)walk(n.arg);if(n.left)walk(n.left);if(n.right)walk(n.right);for(const a of n.args||[])walk(a);
 }
 walk(ast);return source;
}
// LibreOffice emits aca="false" on ordinary scalar formulas. Normalize only these
// known flags in a private parsing copy; do not loosen the legacy editor parser or
// rewrite the user's archive. Shared/array/reference/unknown attributes still fail.
function nativeModel(bytes){
 const files=office.zip.unzipSync(bytes);
 for(const name of Object.keys(files).filter(n=>/^xl\/worksheets\/[^/]+\.xml$/.test(n))){
  const xml=new office.DOMParser({onError:()=>{throw Error('公式工作表XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files[name]),'application/xml');let changed=false;
  for(const f of Array.from(xml.getElementsByTagNameNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main','f'))){
   for(const a of Array.from(f.attributes)){
    if(a.name==='aca'&&a.value==='false'||a.name==='t'&&a.value==='normal'){f.removeAttribute(a.name);changed=true;}else throw Error('公式不支持共享/数组或未知属性');
   }
  }
  if(changed)files[name]=new TextEncoder().encode(new office.XMLSerializer().serializeToString(xml));
 }
 return workbookModel(files);
}
// Preserve exact decimal literal identity, including native exponent spelling changes.
// Do not use Number here: adjacent large decimals must never collapse in a receipt.
function formulaIdentity(source){
 const text=nativeFormula(source),tokens=text.match(/(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:E[+-]?[0-9]+)?|\$?[A-Z]{1,2}\$?[1-9][0-9]{0,3}|[A-Z]+|[()+*/^%,:<>=-]/g);
 return tokens.map(t=>{
  if(!/^[0-9.]/.test(t))return ['token',t];
  const [mantissa,exponent='0']=t.split('E'),[whole,fraction='']=mantissa.split('.');let digits=((whole||'0')+fraction).replace(/^0+/,'');if(!digits)return ['number','0'];let power=Number(exponent)-fraction.length;while(digits.endsWith('0')){digits=digits.slice(0,-1);power++;}return ['number',digits+'e'+power];
 });
}
function semantic(bytes){return workbookContentSnapshot(bytes).map(([name,records])=>[name,records.map(r=>r[1]==='formula'?[r[0],r[1],formulaIdentity(r[2])]:r)]);}
export function nativeFormulaPlan(bytes,cells,source){
 const range=cellSelection(cells);if(range.rows!==1||range.columns!==1)throw Error('公式工具仅修改已定位的一个单元格');
 const formula=nativeFormula(source),{sheets}=nativeModel(bytes),before=semantic(bytes),sheet=sheets[cells.part];if(!sheet)throw Error('公式工作表不存在');
 for(const s of sheets){
  if(s.doc.getElementsByTagNameNS('*','mergeCell').length)throw Error('公式工具暂不支持含合并区域的工作簿');
  for(const c of s.cells.values())if(c.formula!==undefined)c.formula=nativeFormula(c.formula);
 }
 const old=sheet.cells.get(cells.ref)||{};sheet.cells.set(cells.ref,{...old,formula,value:null});const calculated=calculateWorkbook(sheets);
 for(let i=0;i<sheets.length;i++)for(const [address,c] of sheets[i].cells){if(c.formula===undefined)continue;const v=calculated.values.get(i+'!'+address);if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>Number.MAX_SAFE_INTEGER)throw Error('本轮原生公式仅支持有限安全量级数值结果（绝对值≤2^53-1），错误/布尔/文本结果未执行');}
 const expected=structuredClone(before),records=expected[cells.part][1],at=records.findIndex(r=>r[0]===cells.ref),entry=[cells.ref,'formula',formulaIdentity(formula)];if(at<0)records.push(entry);else records[at]=entry;records.sort((a,b)=>a[0].localeCompare(b[0],'en'));
 function verify(output){
  if(JSON.stringify(semantic(output))!==JSON.stringify(expected))throw Error('公式输出的工作簿数据或公式不一致，未发布');
  const actual=nativeModel(output).sheets;
  for(let i=0;i<sheets.length;i++)for(const [address,c] of sheets[i].cells){
   if(c.formula===undefined)continue;const value=actual[i]?.cells.get(address)?.value,expectedValue=calculated.values.get(i+'!'+address);
   const equal=typeof value===typeof expectedValue&&(typeof value==='number'?Number.isFinite(value)&&(Number.isSafeInteger(expectedValue)?value===expectedValue:Math.abs(value-expectedValue)<=Math.max(1e-12,8*Number.EPSILON*Math.abs(expectedValue))):value===expectedValue);
   if(!equal)throw Error('原生公式计算结果不一致：'+address+'，保留草稿未发布');
  }
 }
 return {formula,verify};
}
export const officeFormulaDefinition={type:'function',function:{name:'office_set_formula',description:'经逐次批准将当前Excel原生单个单元格写入公式并计算、保存新版本。仅支持绝对值≤2^53-1的有限数值结果，比较可用于IF条件。formula支持同表A1/$引用、算术/百分比/比较及SUM/AVERAGE/MIN/MAX/COUNT/IF/ROUND七函数；引用限128列5000行、累计10000格，400 ASCII字符；无跨表、外链、字符串字面量、任意函数。先验证整个工作簿公式依赖与预算、拒绝循环/错误/不支持的既有公式及合并/图表/结构化表；保存前核验全工作簿数据与公式、所有公式计算缓存。只覆盖当前单格，不拖填扩区，原件前版保留。每轮与其他修改共用一次额度。',parameters:{type:'object',properties:{formula:{type:'string',maxLength:400}},required:['formula'],additionalProperties:false}}};
