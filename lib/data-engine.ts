export type DataTable={columns:string[],rows:Record<string,string>[],name?:string};
export function parseCSV(text:string):DataTable{
 text=text.replace(/^\uFEFF/,'');const lines:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!cell||quoted)quoted=!quoted;else cell+=c;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))lines.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('CSV 引号未闭合，请检查文件');row.push(cell);if(row.some(x=>x.trim()))lines.push(row);if(lines.length<2)throw new Error('数据需要标题行和至少一行记录');
 const used=new Set<string>();const columns=lines[0].map((c,i)=>{let n=c.trim()||`字段${i+1}`;while(used.has(n))n+='_';used.add(n);return n;});if(columns.length>60||lines.length>5001)throw new Error('当前数据集上限为 5000 行、60 列，请拆分文件');
 return {columns,rows:lines.slice(1).map((r,i)=>{if(r.length>columns.length)throw new Error(`第 ${i+2} 行列数超出标题`);return Object.fromEntries(columns.map((c,j)=>[c,r[j]??'']));})};
}
function serializeCSV(cells:unknown[][]){const quote=(x:unknown)=>'"'+String(x??'').replace(/"/g,'""')+'"';return '\uFEFF'+cells.map(r=>r.map(quote).join(',')).join('\r\n');}
// Lossless serialization for data interchange. Never use directly for spreadsheet downloads.
export function toCSV(columns:string[],rows:Record<string,unknown>[]){return serializeCSV([columns,...rows.map(r=>columns.map(c=>r[c]))]);}
// CSV has no cell types. Mark potentially active text (including headers) explicitly.
// Do not mutate source records or promise safety after a spreadsheet saves/reopens CSV.
export function toSpreadsheetCSV(columns:string[],rows:Record<string,unknown>[]){
 let protectedCells=0;
 const protect=(value:unknown)=>{
  if(typeof value==='number'&&Number.isFinite(value))return value;
  const text=String(value??'');
  if(/^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(text)||/^[\p{Cc}\p{Cf}]/u.test(text)){
   protectedCells++;return "'"+text;
  }
  return text;
 };
 const cells=[columns,...rows.map(r=>columns.map(c=>r[c]))].map(row=>row.map(protect));
 return {csv:serializeCSV(cells),protectedCells};
}
export function numeric(v:unknown){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(String(v).replace(/[,¥￥$]/g,''));return Number.isFinite(n)?n:null;}
export function analyze(table:DataTable,query:any){
 const {group='',metric='',aggregate='count',filterColumn='',filterValue='',sort='desc'}=query;
 if(group&&!table.columns.includes(group)||metric&&!table.columns.includes(metric)||filterColumn&&!table.columns.includes(filterColumn)||!['count','sum','avg','min','max'].includes(aggregate))throw new Error('分析字段或聚合方式无效');
 if(aggregate!=='count'&&!metric)throw new Error('请选择数值字段');
 const filtered=table.rows.filter(r=>!filterColumn||String(r[filterColumn]).toLowerCase().includes(String(filterValue).toLowerCase()));
 const groups=new Map<string,{rows:number,values:number[]}>();for(const row of filtered){const key=group?String(row[group]||'（空）'):'全部';const g=groups.get(key)||{rows:0,values:[]};g.rows++;const n=numeric(row[metric]);if(n!==null)g.values.push(n);groups.set(key,g);}
 const result=[...groups].map(([name,g])=>({name,value:aggregate==='count'?g.rows:!g.values.length?null:aggregate==='sum'?g.values.reduce((a,b)=>a+b,0):aggregate==='avg'?g.values.reduce((a,b)=>a+b,0)/g.values.length:aggregate==='min'?Math.min(...g.values):Math.max(...g.values),count:g.rows})).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'zh-CN'):(sort==='asc'?1:-1)*((a.value??0)-(b.value??0)));
 return {data:result.slice(0,100),totalGroups:result.length,totalRows:table.rows.length,filteredRows:filtered.length,explanation:{dataset:table.name||'数据集',group,metric,aggregate,filter:filterColumn?`${filterColumn} 包含 ${filterValue}`:'无',rule:aggregate==='count'?'统计符合筛选条件的行数':'空值和非数值排除；数值中的货币符号和千位逗号被移除',truncated:result.length>100},preview:filtered.slice(0,100)};
}
