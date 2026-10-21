'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,X} from 'lucide-react';
import {Button} from '@/components/ui/button';

export default function DocumentProposal({proposal,onDecision,onStatus}:{proposal:{id:string,name:string,rowCount:number,columnCount:number,expiresAt:number,proposalDigest?:string,preview?:{columns:string[],rows:string[][],hiddenColumns:number,hiddenRows:number}},onDecision:(action:'approve'|'reject')=>Promise<void>,onStatus:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[expired,setExpired]=useState(()=>Date.now()>=proposal.expiresAt);
 const statusRef=useRef(onStatus);statusRef.current=onStatus;
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const sync=()=>void statusRef.current().catch(()=>{});
  const schedule=()=>{const remaining=proposal.expiresAt-Date.now();if(remaining<=0){setExpired(true);sync();}else timer=setTimeout(()=>{setExpired(true);sync();},remaining);};
  const visible=()=>{if(document.visibilityState==='visible')sync();};
  schedule();sync();document.addEventListener('visibilitychange',visible);
  return()=>{if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
 },[proposal.id,proposal.expiresAt]);
 const decide=async(action:'approve'|'reject')=>{setBusy(true);try{await onDecision(action);}finally{setBusy(false);}};
 return <div className="sources"><b>{expired?'提议已过期：':'待批准：'}{proposal.name}</b><p>{proposal.rowCount} 行 / {proposal.columnCount} 列。{expired?'已超过有效期，系统不会生成文件。':'批准后才会生成并保存文件；提议于 '+new Date(proposal.expiresAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})+' 失效。'}</p>{proposal.proposalDigest&&<p className="proposal-digest" title={proposal.proposalDigest}>内容指纹 SHA-256：{proposal.proposalDigest.slice(0,12)}…</p>}{proposal.preview&&<div className="proposal-preview" aria-label="表格内容预览"><table><thead><tr>{proposal.preview.columns.map((column,index)=><th key={index}>{column}</th>)}</tr></thead><tbody>{proposal.preview.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,index)=><td key={index}>{cell}</td>)}</tr>)}</tbody></table>{(proposal.preview.hiddenRows>0||proposal.preview.hiddenColumns>0)&&<span>另有 {proposal.preview.hiddenRows} 行、{proposal.preview.hiddenColumns} 列未展示；批准后按完整提议生成。</span>}</div>}{!expired&&<div className="button-row"><Button disabled={busy} onClick={()=>decide('approve')}><Check size={16}/>{busy?'正在处理…':'批准生成'}</Button><Button variant="outline" disabled={busy} onClick={()=>decide('reject')}><X size={16}/>拒绝</Button></div>}</div>;
}
