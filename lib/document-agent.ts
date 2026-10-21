import {unzipSync,strFromU8} from 'fflate';
import {buildXlsx} from './xlsx-export';
import {complete,type Message} from './model';
export const DOCUMENT_PROPOSAL_TTL_MS=10*60*1000;
export const spreadsheetTool={type:'function',function:{name:'create_spreadsheet',description:'生成真实可下载 XLSX。仅在用户要求表格文件时调用。无公式执行；所有字符串按文本保存。列名必须唯一，行数组必须与列数一致；最多 50 列、500 行。',parameters:{type:'object',additionalProperties:false,required:['name','columns','rows'],properties:{name:{type:'string'},columns:{type:'array',items:{type:'string'}},rows:{type:'array',items:{type:'array',items:{type:['string','number','boolean','null']}}}}}}};
export const documentInstruction='\n你可调用 create_spreadsheet 提议生成真实 XLSX 文件。用户要求 Excel/XLSX 文件时应调用工具，而不是让用户复制表格。缺少必要数据则先询问，不编造业务数据。工具调用只会形成待用户审阅的提议；不得声称文件已经生成。用户明确批准后，系统才会生成、校验并显示下载按钮。每次回复最多提议一个文件；不能运行代码、访问本机或执行外部操作。';
export function spreadsheetSpec(raw:string){
 if(typeof raw!=='string'||raw.length>80000)throw new Error('工具参数超过 80000 字符');
 const p=JSON.parse(raw);if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['name','columns','rows'].includes(k)))throw new Error('表格参数格式无效');
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>80)throw new Error('文件名需要 1–80 字');
 const {columns,rows}=p;
 if(!Array.isArray(columns)||!columns.length||columns.length>50||columns.some(c=>typeof c!=='string'||!c.trim()||c.length>100)||new Set(columns).size!==columns.length)throw new Error('列名必须非空且唯一，最多 50 列');
 if(!Array.isArray(rows)||rows.length>500||rows.some(r=>!Array.isArray(r)||r.length!==columns.length||r.some(v=>v!==null&&!['string','number','boolean'].includes(typeof v)||typeof v==='number'&&!Number.isFinite(v)||typeof v==='string'&&v.length>4000)))throw new Error('最多 500 行；每行列数须一致，单元格只接受普通文本、有限数字、布尔值或空值');
 return {name:p.name.trim(),columns:columns as string[],rows:rows as Array<Array<string|number|boolean|null>>};
}
export function spreadsheetPreview(spec:ReturnType<typeof spreadsheetSpec>){
 const visibleColumns=6,visibleRows=5,cell=(value:string|number|boolean|null)=>value===null?'空':String(value).replace(/\s+/g,' ').slice(0,80);
 return {columns:spec.columns.slice(0,visibleColumns).map(cell),rows:spec.rows.slice(0,visibleRows).map(row=>row.slice(0,visibleColumns).map(cell)),hiddenColumns:Math.max(0,spec.columns.length-visibleColumns),hiddenRows:Math.max(0,spec.rows.length-visibleRows)};
}
export async function spreadsheetProposalDigest(spec:ReturnType<typeof spreadsheetSpec>){
 const canonical=JSON.stringify({name:spec.name,columns:spec.columns,rows:spec.rows});
 const bytes=new TextEncoder().encode(canonical),hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function createSpreadsheet(raw:string){
 const p=spreadsheetSpec(raw),{columns,rows}=p;
 const bytes=buildXlsx(columns,rows.map(r=>Object.fromEntries(columns.map((c,i)=>[c,r[i]]))));
 if(bytes.length>200000)throw new Error('成果超过 200KB 限额');
 const files=unzipSync(bytes);const sheet=strFromU8(files['xl/worksheets/sheet1.xml']||new Uint8Array());
 if(!files['xl/workbook.xml']||!files['[Content_Types].xml']||(sheet.match(/<row /g)||[]).length!==rows.length+1||/<f(?:\s|>)/.test(sheet))throw new Error('XLSX 结构验收失败');
 const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource)),x=>x.toString(16).padStart(2,'0')).join('');
 const stem=p.name.replace(/\.xlsx$/i,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').trim()||'幕云AI表格';
 return {bytes,name:stem+'.xlsx',sha256,size:bytes.length,rowCount:rows.length,columnCount:columns.length,mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
}
export async function runDocumentAgent(profile:any,key:string,messages:Message[],signal:AbortSignal|undefined,recordUsage:(r:any)=>Promise<void>,persistProposal:(spec:ReturnType<typeof spreadsheetSpec>,raw:string)=>Promise<any>){
 const result=await complete({...profile,maxTokens:Math.min(profile.maxTokens||2048,2048)},key,messages,signal,[spreadsheetTool]);
 await recordUsage(result);
 const events:any[]=[{type:'model',message:'模型响应完成',usage:result.usage}],proposals:any[]=[];
 if(!result.toolCalls.length)return {...result,events,proposals};
 if(result.truncated)throw new Error('工具参数达到输出上限，未创建提议，请减少表格内容');
 if(result.toolCalls.length!==1)throw new Error('每次只允许提议一个文档工具，未创建提议');
 const call=result.toolCalls[0];
 if(typeof call.id!=='string'||!call.id||call.type!=='function'||call.function?.name!=='create_spreadsheet')throw new Error('不支持此工具，未创建提议');
 try{
  const spec=spreadsheetSpec(call.function.arguments);
  const proposal=await persistProposal(spec,call.function.arguments);
  proposals.push(proposal);events.push({type:'tool_proposed',message:'XLSX 提议已保存，等待用户批准',proposal:{id:proposal.id,name:proposal.name,rowCount:proposal.rowCount,columnCount:proposal.columnCount,expiresAt:proposal.expiresAt,preview:proposal.preview,proposalDigest:proposal.proposalDigest}});
  return {...result,text:'已准备一份表格生成提议。请核对文件名、列数和行数，明确批准后系统才会生成文件。',events,proposals,toolCalls:[]};
 }catch(error){
  events.push({type:'tool_error',message:error instanceof SyntaxError?'工具参数不是有效 JSON':error instanceof Error?error.message:'提议无效'});
  return {...result,text:'表格提议未通过参数校验，请查看执行记录并修改要求。',events,proposals,toolCalls:[]};
 }
}
