'use client';
import {useState} from 'react';
import {Download,Plus,Trash2,Monitor,GitBranch,FileText} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import GenOfficePanel from './genoffice-panel';

export default function LocalExecution(){
 const [documents,setDocuments]=useState([{title:'项目进展报告',text:''}]);
 const [sheetTitle,setSheetTitle]=useState('项目数据汇总');
 const [sheetCsv,setSheetCsv]=useState('项目,负责人,数量,状态\nA项目,张三,12,进行中\nB项目,李四,23,已完成');
 function savePlan(plan:object,filename:string,message:string){
  const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast.success(message);
 }
 function download(){
  if(documents.some(d=>!d.text.trim()||d.text.length>40000||d.title.length>200)){toast.error('请填写每份文档正文；正文最多 4 万字，标题最多 200 字');return;}
  const tasks=documents.flatMap((d,i)=>{const id=`doc_${i+1}`;return [
   {id,kind:'document',title:d.title||'幕云AI文档',text:d.text,dependsOn:[]},
   {id:id+'_render',kind:'render',title:'生成 Word 与 PDF',dependsOn:[id]},
   {id:id+'_preview',kind:'preview',title:'渲染逐页预览',dependsOn:[id+'_render']},
  ];});
  tasks.push({id:'deliverables',kind:'bundle',title:'汇总可下载成果',dependsOn:tasks.filter(t=>t.kind==='render'||t.kind==='preview').map(t=>t.id)} as typeof tasks[number]);
  savePlan({name:'文档生成与渲染',tasks},'muyun-document-plan.json','文档计划已导出，请在本地任务台导入并执行');
 }
 function downloadSheet(){
  if(!sheetCsv.trim()||sheetCsv.length>40000||sheetTitle.length>200){toast.error('请填写 CSV 数据；数据最多 4 万字，标题最多 200 字');return;}
  const tasks=[
   {id:'sheet_1',kind:'spreadsheet',title:sheetTitle||'幕云AI表格',csv:sheetCsv,dependsOn:[]},
   {id:'sheet_1_render',kind:'sheet_render',title:'生成 Excel 与 PDF',dependsOn:['sheet_1']},
   {id:'sheet_1_preview',kind:'sheet_preview',title:'渲染表格逐页预览',dependsOn:['sheet_1_render']},
   {id:'deliverables',kind:'bundle',title:'汇总可下载成果',dependsOn:['sheet_1_render','sheet_1_preview']},
  ];
  savePlan({name:'表格生成与渲染',tasks},'muyun-spreadsheet-plan.json','表格计划已导出，请在本地任务台导入并执行');
 }
 return <section className="content-page suite-page">
  <div className="page-heading"><div><span className="eyebrow">幕云AI · 本地执行</span><h1>本地任务与文档</h1><p>把文档任务拆成可并发的步骤，在你的电脑上生成文件和页面预览。</p></div><Monitor size={30}/></div>
  <div className="suite-panel"><h2>启动本地任务台</h2><p>下载完整源码包后，在解压目录运行：</p><pre className="suite-code">python3 local-runner/server.py --concurrency 2</pre>
   <div className="suite-row"><Button asChild><a href="http://127.0.0.1:8765" target="_blank" rel="noreferrer">打开本地任务台 ↗</a></Button><span className="pill">需要本机启动执行器</span></div>
   <p className="help-text">需要 Python 3.10+、LibreOffice、Poppler 和中文字体。代码执行另需 Docker 及 Python/Node 运行镜像。网页无法自行安装或启动本机程序；没有连接本机时，不显示为已就绪。</p>
  </div>
  <div className="suite-panel"><h2>成果验收</h2><p>新版本地执行器在标记任务成功前核对实际文件，记录大小和 SHA-256；后续步骤及下载时重新检查。缺失、空文件或被改动的成果会停止交付。</p><p className="help-text">在本地任务台展开“已校验成果”查看证据。文件完整性不等于内容准确性，文档仍需审阅；旧任务需重新执行才能获得校验记录。请更新本机源码后使用。</p></div>
  <GenOfficePanel/><div className="suite-grid"><div className="suite-panel"><GitBranch/><h3>按依赖并发执行</h3><p>独立任务默认并发 2，最多 4；前置失败阻断后续，支持取消、状态持久化与执行日志。</p></div><div className="suite-panel"><FileText/><h3>实际生成和渲染</h3><p>每份文档自动拆为生成、Word/PDF 转换、逐页图片三个任务。不同文档可同时处理。</p></div></div>
  <div className="suite-panel"><h2>准备本地文档任务</h2><p>填写正文，导出计划后在本地任务台导入、校验并执行。任务内容仅随下载文件交给你，不在此页面上传。</p>
   {documents.map((doc,i)=><div className="suite-panel form-fields" key={i}><div className="suite-row"><h3>文档 {i+1}</h3><Button variant="ghost" disabled={documents.length===1} aria-label={`移除文档 ${i+1}`} onClick={()=>setDocuments(d=>d.filter((_,j)=>i!==j))}><Trash2 size={16}/></Button></div><label>标题<Input value={doc.title} maxLength={200} onChange={e=>setDocuments(d=>d.map((x,j)=>i===j?{...x,title:e.target.value}:x))}/></label><label>正文<Textarea value={doc.text} maxLength={40000} rows={6} onChange={e=>setDocuments(d=>d.map((x,j)=>i===j?{...x,text:e.target.value}:x))}/></label><p className="help-text">生成文档 → LibreOffice 转为 Word/PDF → 渲染逐页预览</p></div>)}
   <div className="suite-row"><Button variant="outline" disabled={documents.length>=10} onClick={()=>setDocuments(d=>[...d,{title:'新的文档',text:''}])}><Plus/>添加文档</Button><Button onClick={download}><Download/>拆解并导出 {documents.length*3+1} 项任务</Button></div>
  </div>
  <div className="suite-panel"><h2>准备本地表格任务</h2><p>粘贴 CSV 数据，生成可编辑 Excel、PDF、逐页预览及带哈希清单的成果包。公式样式内容按文本处理。</p>
   <div className="form-fields"><label>标题<Input value={sheetTitle} maxLength={200} onChange={e=>setSheetTitle(e.target.value)}/></label><label>CSV 数据<Textarea value={sheetCsv} maxLength={40000} rows={7} onChange={e=>setSheetCsv(e.target.value)}/></label></div>
   <Button onClick={downloadSheet}><Download/>拆解并导出 4 项表格任务</Button>
  </div>
  <p className="help-text">当前是规则拆解与本机执行首版：尚未接入模型自主拆解、多个智能体协作或云端自动配对。代码适配器要求 Docker 隔离，当前开发环境未完成真实容器验收；不可用时拒绝执行。LibreOffice 只处理固定模板生成的文档，暂不接受任意 Office 文件或宏。</p>
 </section>;
}
