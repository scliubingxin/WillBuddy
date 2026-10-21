// Deterministic conversion of assistant content; no model inference or network.
export type MarkdownTable={columns:string[],rows:Record<string,string>[],matrix:string[][]};
function cells(line:string){
 let source=line.trim();if(source.startsWith('|'))source=source.slice(1);if(source.endsWith('|')&&!source.endsWith('\\|'))source=source.slice(0,-1);
 const result:string[]=[];let value='',code=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];if(c==='\\'&&source[i+1]==='|'){value+='|';i++;continue;}
  if(c==='`')code=!code;
  if(c==='|'&&!code){result.push(value.trim());value='';}else value+=c;
 }
 result.push(value.trim());return result;
}
export function markdownTables(text:string):MarkdownTable[]{
 const lines=text.split(/\r?\n/),tables:MarkdownTable[]=[];let fenced=false;
 for(let i=0;i<lines.length-1;i++){
  if(/^\s*```/.test(lines[i])){fenced=!fenced;continue;}
  if(fenced||!lines[i].includes('|'))continue;
  const headers=cells(lines[i]),divider=cells(lines[i+1]);
  if(headers.length<2||divider.length!==headers.length||!divider.every(c=>/^:?-{3,}:?$/.test(c)))continue;
  const used=new Set<string>(),columns=headers.map((h,j)=>{let name=h||`列 ${j+1}`;while(used.has(name))name+='（重复）';used.add(name);return name;});
  const matrix:string[][]=[headers];i+=2;
  while(i<lines.length&&lines[i].trim()&&lines[i].includes('|')&&!/^\s*```/.test(lines[i])){
   const row=cells(lines[i]);if(row.length!==headers.length)throw new Error('表格列数不一致，请先修正内容再导出');
   matrix.push(row);i++;
  }
  if(matrix.length>10001||headers.length>100)throw new Error('表格过大，请在数据工作区处理');
  tables.push({columns,matrix,rows:matrix.slice(1).map(row=>Object.fromEntries(columns.map((c,j)=>[c,row[j]])))});i--;
 }
 return tables;
}
export function genOfficePlan(action:string,payload:unknown,input?:{extension:string,base64:string},to?:string){
 return {name:'GenOffice · '+action,tasks:[{id:'office',kind:'genoffice',title:'GenOffice 文档操作',action,payload,dependsOn:[],...(input?{input}:{}),...(to?{to}:{})}]};
}
export function saveOfficePlan(plan:unknown){
 const bytes=JSON.stringify(plan,null,2);if(new TextEncoder().encode(bytes).length>800000)throw new Error('计划超过 800KB，请拆分内容');
 const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='muyun-genoffice-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
