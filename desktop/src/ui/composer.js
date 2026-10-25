/** Compact, progressively disclosed composer. No bridge access or authorization logic. */
export function compactComposer({state,agentId,files,images,sendImages,live,toolsEnabled,icon,escape,modelName,modelMarkup}) {
  const attachments=[...images.map((i,n)=>`<span class="attachment-chip">图片：${escape(i.name)}<button data-action="detachImage" data-id="${n}" aria-label="移除图片 ${escape(i.name)}">×</button></span>`),...files.map((f,i)=>`<span class="attachment-chip">${icon('file')}<button data-action="attachedPreview" data-id="${i}">${escape(f.entryPath||f.name)}${f.archive?`（ZIP: ${escape(f.archive)}）`:''}</button><button data-action="detach" data-id="${i}" aria-label="移除 ${escape(f.name)}">×</button></span>`)];
  return `<div class="composer-dock"><div class="composer compact-composer"><div id="inlinePicker" class="inline-picker" hidden role="listbox" aria-label="选择上下文或智能体"></div>${attachments.length?`<div class="chips">${attachments.join('')}</div>`:''}${images.length?`<label class="image-send-consent"><input id="sendImages" type="checkbox" ${sendImages?'checked':''}>本轮发送图片给模型</label>`:''}<textarea id="prompt" aria-label="任务描述" placeholder="想一起完成什么？ @ 添加资料，/ 选择智能体" title="Enter 发送 · Shift Enter 换行" maxlength="20000"></textarea><div class="composer-bar"><div class="composer-bar-start"><details class="composer-menu" data-composer-menu="add"><summary data-composer-trigger="add" aria-label="添加附件与工具" aria-controls="composerAddPanel" aria-expanded="false" title="添加文件、图片和资料；设置工具权限">${icon('plus')}</summary><div id="composerAddPanel" class="composer-popover" role="group" aria-label="附件与工具"><div class="composer-menu-title">添加到本轮对话</div><button data-action="attach" aria-label="上传问答附件">${icon('file')}<span>上传文件或 ZIP</span></button><button data-action="attachImage">${icon('plus')}<span>添加图片</span></button><button data-action="imageLibrary">${icon('grid')}<span>本机图片</span></button><button data-action="contextPicker">${icon('folder')}<span>已授权资料 <kbd>@</kbd></span></button><div class="composer-menu-divider"></div><label class="composer-tool-option"><span>${icon('shield')}允许使用工具</span><input id="toolMode" type="checkbox" ${toolsEnabled?'checked':''} ${live?'disabled':''}></label><p class="composer-menu-note">文档、浏览器、CLI 与 MCP 仍需对应授权。</p><button data-page="tools">${icon('activity')}<span>打开工具台</span></button><details class="composer-help"><summary>附件格式与隐私</summary><p>文件正文在发送后交给所选模型。ZIP 输入最多32 MiB，最多32份正文、合计10万字符；未读取文件会列出原因。图片只有勾选后才发送。PDF、视频和嵌套压缩包暂不解析。</p></details></div></details><select id="agent" class="composer-agent" aria-label="选择智能体" title="选择智能体">${state.agents.map(a=>`<option value="${escape(a.id)}" ${a.id===agentId?'selected':''}>${escape(a.name)}</option>`).join('')||'<option>WillBuddy 助手</option>'}</select></div><div class="composer-bar-end"><details class="composer-menu" data-composer-menu="model"><summary data-composer-trigger="model" aria-label="模型与思考设置" aria-controls="composerModelPanel" aria-expanded="false" title="${escape(modelName)}"><span>${escape(modelName)}</span><span class="composer-chevron" aria-hidden="true">⌄</span></summary><div id="composerModelPanel" class="composer-popover composer-model-popover" role="group" aria-label="模型与思考设置"><div class="composer-menu-title">本轮使用</div>${modelMarkup}</div></details>${live?`<button class="send stopping" data-action="stop" aria-label="停止生成">${icon('stop')}</button>`:`<button class="send" data-action="send" aria-label="发送任务">${icon('up')}</button>`}</div></div></div></div>`;
}

/** One controller per app root; keeps menu/form focus through unrelated redraws. */
export function createComposerMenus(app) {
  const doc=app.ownerDocument,win=doc.defaultView;
  let scope,opened='',focused='';
  const menu=()=>app.querySelector(`[data-composer-menu="${opened}"]`);
  function position(){
    const d=menu();if(!d?.open)return;
    const panel=d.querySelector('.composer-popover'),trigger=d.querySelector('[data-composer-trigger]'),r=trigger.getBoundingClientRect();
    const margin=12,width=Math.min(opened==='model'?340:292,Math.max(0,win.innerWidth-2*margin));
    panel.style.width=width+'px';
    const below=win.innerHeight-r.bottom-margin-8,above=r.top-margin-8;
    const up=below<Math.min(panel.scrollHeight,340)&&above>below;
    const space=Math.max(40,up?above:below);panel.style.maxHeight=space+'px';
    const height=Math.min(panel.scrollHeight,space);
    const left=opened==='model'?r.right-width:r.left;
    panel.style.left=Math.max(margin,Math.min(left,win.innerWidth-width-margin))+'px';
    panel.style.top=(up?Math.max(margin,r.top-height-8):r.bottom+8)+'px';
  }
  function close(restore=false){const d=menu(),trigger=d?.querySelector('[data-composer-trigger]');if(d){d.open=false;trigger?.setAttribute('aria-expanded','false');}opened='';if(restore)trigger?.focus();}
  function click(e){
    const trigger=e.target.closest('[data-composer-trigger]');
    if(trigger&&app.contains(trigger)){e.preventDefault();const id=trigger.dataset.composerTrigger,was=id===opened;close();if(!was){opened=id;const d=menu();d.open=true;trigger.setAttribute('aria-expanded','true');position();}return;}
    if(e.target.closest('.composer-popover [data-action],.composer-popover [data-page]'))close();
  }
  function outside(e){if(opened&&!menu()?.contains(e.target))close();}
  function key(e){if(opened&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}}
  function scroll(e){if(opened&&!e.target.closest?.('.composer-popover'))position();}
  app.addEventListener('click',click);doc.addEventListener('pointerdown',outside,true);doc.addEventListener('focusin',outside);doc.addEventListener('keydown',key,true);doc.addEventListener('scroll',scroll,true);win.addEventListener('resize',position);
  return {
    beforeRender(){focused=opened&&menu()?.contains(doc.activeElement)?doc.activeElement.id:'';},
    afterRender(nextScope){if(scope!==nextScope){opened='';focused='';}scope=nextScope;const d=menu();if(d&&opened){d.open=true;d.querySelector('[data-composer-trigger]').setAttribute('aria-expanded','true');position();if(focused)doc.getElementById(focused)?.focus();}else opened='';},
    dispose(){close();app.removeEventListener('click',click);doc.removeEventListener('pointerdown',outside,true);doc.removeEventListener('focusin',outside);doc.removeEventListener('keydown',key,true);doc.removeEventListener('scroll',scroll,true);win.removeEventListener('resize',position);}
  };
}
