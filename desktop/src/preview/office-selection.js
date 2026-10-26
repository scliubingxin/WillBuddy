/** Selection controls stay inside the opaque preview. Parent must verify source coordinates. */
export function installOfficeSelection(content,token){
 let request;const bar=document.createElement('div');bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Word选区操作');
 Object.assign(bar.style,{position:'fixed',bottom:'12px',left:'12px',right:'12px',padding:'10px',background:'#FFFFFF',border:'1px solid #0078CB',borderRadius:'8px',zIndex:'10000',display:'none',boxShadow:'0 2px 12px #0002'});
 const note=document.createElement('span');bar.append(note);
 function send(action){if(request)parent.postMessage({kind:'office-selection',token,action,request},'*');}
 for(const [label,action] of [['附加选区到对话','attach'],['编辑选中文字','edit'],['取消选区','clear']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.marginLeft='8px';b.onclick=()=>action==='clear'?(request=null,bar.style.display='none',getSelection()?.removeAllRanges()):send(action);bar.append(b);}
 document.body.append(bar);
 function show(r){request=r;note.textContent=r.kind==='text'?'已选 '+r.text.length+' 字':'已选表格 '+r.rows.length+' 行';bar.style.display='block';bar.children[2].disabled=r.kind!=='text';}
 content.addEventListener('mouseup',()=>{
  const s=getSelection();if(!s||s.isCollapsed||s.rangeCount!==1)return;
  const r=s.getRangeAt(0),a=(r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement).closest('p'),b=(r.endContainer.nodeType===1?r.endContainer:r.endContainer.parentElement).closest('p');
  if(!a||a!==b||!a.closest('article')||!content.contains(a)||s.toString().length>4000)return;
  const before=r.cloneRange();before.selectNodeContents(a);before.setEnd(r.startContainer,r.startOffset);const start=before.toString().length,text=s.toString(),blockText=a.textContent;
  const peers=[...content.querySelectorAll('article p')].filter(p=>p.textContent===blockText);
  show({kind:'text',blockText,start,end:start+text.length,text,occurrence:peers.indexOf(a)});
 });
 content.addEventListener('click',e=>{if(!getSelection()?.isCollapsed)return;const t=e.target.closest('table');if(!t||!content.contains(t)||t.querySelector('table'))return;
  const rows=[...t.rows].map(r=>[...r.cells].map(c=>[...c.querySelectorAll('p')].map(p=>p.textContent).join('\n')));
  const peers=[...content.querySelectorAll('article table')].filter(x=>!x.querySelector('table')).filter(x=>JSON.stringify([...x.rows].map(r=>[...r.cells].map(c=>[...c.querySelectorAll('p')].map(p=>p.textContent).join('\n'))))===JSON.stringify(rows));
  show({kind:'table',rows,occurrence:peers.indexOf(t)});
 });
}
