// Serialized into an isolated world. No application bridge or Node is exposed.
export function browserDom(operation, key, payload) {
  const norm=value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,160);
  const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&r.width>0&&r.height>0;};
  const inputType=el=>(el.getAttribute('type')||'text').toLowerCase();
  const editable=el=>el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&['text','search','url','tel'].includes(inputType(el)));
  const blocked=el=>el.matches(':disabled')||el.getAttribute('aria-disabled')==='true'||el.readOnly||el.closest('[inert]');
  const label=el=>norm(el.getAttribute('aria-label')||[...(el.labels||[])].map(x=>x.textContent).join(' ')||el.textContent||el.getAttribute('placeholder')||el.getAttribute('name')||el.tagName);
  const descriptor=el=>({tag:el.tagName,type:inputType(el),kind:editable(el)?'input':'click',label:label(el),href:el.tagName==='A'?el.href:'',formAction:el.form?.action||'',formMethod:el.form?.method||'',disabled:!!blocked(el)});
  const signature=el=>JSON.stringify([descriptor(el),el.getAttribute('name'),editable(el)?el.value:null,el.form?[...el.form.elements].slice(0,200).map(e=>[e.name,e.type,e.value,e.checked]):null]);
  if(operation==='snapshot'){
    const state={id:payload.snapshotId,url:location.href,nodes:new Map()};globalThis[key]=state;
    const elements=[];let visited=0,truncated=false;
    for(const el of document.querySelectorAll('a[href],button,input,textarea,[role="button"]')){
      if(++visited>3000||elements.length>=120){truncated=true;break;}
      if(!visible(el)||blocked(el))continue;
      if(editable(el)&&/(?:password|cc-|one-time-code)/i.test(el.autocomplete||''))continue;
      if(el.tagName==='INPUT'&&!editable(el)&&!['button','submit','reset'].includes(inputType(el)))continue;
      if(el.tagName==='A'&&!/^https?:/.test(el.href))continue;
      const ref='e'+(elements.length+1);state.nodes.set(ref,{el,signature:signature(el)});elements.push({ref,...descriptor(el)});
    }
    return {url:location.href,title:document.title,elements,truncated};
  }
  const state=globalThis[key];
  if(!state||state.id!==payload.snapshotId||state.url!==location.href)throw new Error('网页快照已失效，请重新检查页面');
  const target=state.nodes.get(payload.ref),el=target?.el;
  if(!el?.isConnected||!visible(el)||blocked(el)||signature(el)!==target.signature)throw new Error('页面元素已变化，请重新检查页面');
  if(operation==='describe')return descriptor(el);
  if(operation==='point'){
    if(editable(el))throw new Error('输入框请使用填写操作');
    el.scrollIntoView({block:'center',inline:'center',behavior:'instant'});
    const r=el.getBoundingClientRect();
    const x=(Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,y=(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2;
    if(x<0||y<0||x>=innerWidth||y>=innerHeight)throw new Error('元素不在可点击视口中');
    const hit=document.elementFromPoint(x,y);
    if(!hit||(hit!==el&&!el.contains(hit)))throw new Error('目标被其他元素遮挡，已停止点击');
    return {x:Math.round(x),y:Math.round(y)};
  }
  if(operation==='focus'){
    if(!editable(el))throw new Error('仅允许填写普通文本、搜索、网址、电话和多行文本框');
    if(/(?:password|cc-|one-time-code)/i.test(el.autocomplete||''))throw new Error('敏感字段需要用户手动填写');
    el.scrollIntoView({block:'center',behavior:'instant'});el.focus();el.setSelectionRange(0,el.value.length);
    return {focused:document.activeElement===el};
  }
  if(operation==='checkFocus'){
    if(!editable(el)||document.activeElement!==el)throw new Error('输入焦点发生变化，已停止填写');
    return true;
  }
  throw new Error('未知的页面操作');
}

export function verifyFilled(key, payload) {
  const state=globalThis[key],el=state?.nodes.get(payload.ref)?.el;
  if(!state||state.id!==payload.snapshotId||state.url!==location.href||!el?.isConnected||document.activeElement!==el)throw new Error('填写期间页面或焦点发生变化');
  if(el.value!==payload.text)throw new Error('页面未接受预期输入，未标记为成功');
  return {length:el.value.length};
}
