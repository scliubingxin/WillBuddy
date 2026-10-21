'use client';
import {useState} from 'react';
import {Download} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
export default function DocumentFile({file}:{file:{id:string,name:string,size:number,rowCount:number,columnCount:number}}){
 const [busy,setBusy]=useState(false);
 return <div className="sources"><b>{file.name}</b><p>已生成并校验 · {file.rowCount} 行 / {file.columnCount} 列 · {file.size.toLocaleString()} 字节</p><Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);try{const response=await fetch('/api/artifact-file?id='+encodeURIComponent(file.id));if(!response.ok){const error:any=await response.json();throw new Error(error.error||'下载失败');}const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e:any){toast.error(e.message);}finally{setBusy(false);}}}><Download size={16}/>{busy?'正在校验下载…':'下载 XLSX'}</Button></div>;
}
