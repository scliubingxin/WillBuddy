'use client';
import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {exportDocx,exportXlsx,printDocument} from '@/lib/file-tools';
import {markdownTables,genOfficePlan,saveOfficePlan} from '@/lib/office-content';
import {toast} from 'sonner';
export default function OfficeActions({name,content}:{name:string,content:string}){
 const [table,setTable]=useState(0),[busy,setBusy]=useState(false);
 const parsed=useMemo(()=>{try{return {tables:markdownTables(content),error:''};}catch(e:any){return {tables:[],error:e.message};}},[content]);
 function run(action:()=>unknown){try{action();}catch(e:any){toast.error(e.message);}}
 const chosen=parsed.tables[table]||parsed.tables[0];
 function sheetPlan(){if(chosen)saveOfficePlan(genOfficePlan('create_xlsx',chosen.matrix.map(row=>row.map(c=>/^\s*=/.test(c)?"'"+c:c))));}
 return <div className="suite-panel" aria-label="文件成果"><div className="suite-row"><b>下载文件</b><span className="help-text">使用当前回复内容生成，下载不调用模型</span></div><div className="button-row">
 <Button size="sm" variant="outline" onClick={()=>run(()=>exportDocx(name,content))}>Word .docx</Button>
 {!!parsed.tables.length&&<><select aria-label="选择要导出的表格" value={table} onChange={e=>setTable(Number(e.target.value))}>{parsed.tables.map((t,i)=><option value={i} key={i}>表格 {i+1} · {t.rows.length} 行</option>)}</select><Button size="sm" variant="outline" onClick={()=>run(()=>exportXlsx(name,chosen.columns,chosen.rows))}>Excel .xlsx</Button></>}
 <Button size="sm" variant="outline" disabled={busy} onClick={async()=>{setBusy(true);try{const {exportPptx}=await import('@/lib/slides');await exportPptx(name,content);}catch(e:any){toast.error(e.message);}finally{setBusy(false);}}}>PowerPoint .pptx</Button>
 <Button size="sm" variant="outline" onClick={()=>run(()=>printDocument(name,content))}>打印 / PDF</Button></div>
 {parsed.error&&<p className="warning-text">{parsed.error}</p>}
 <details><summary>交给 GenOffice 继续处理</summary><p className="help-text">导出计划，在已安装 GenOffice 的本地任务台导入、校验并执行。此处下载的是计划，尚未执行。</p><div className="button-row"><Button size="sm" variant="outline" onClick={()=>run(()=>saveOfficePlan(genOfficePlan('create_docx',content)))}>GenOffice Word 计划</Button>{chosen&&<Button size="sm" variant="outline" onClick={()=>run(sheetPlan)}>GenOffice Excel 计划</Button>}</div><p className="help-text">表格以文本传入，公式样式内容加前导单引号；需要公式时，请在文档操作中明确编辑。已有 Office 文件可在“本地执行 → GenOffice”中读取、编辑、检查或转换。</p></details>
 </div>;
}
