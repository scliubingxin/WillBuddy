import {escape} from './markdown.js';
// Regions are historical OCR metadata, not HTML. Only validated offsets are
// rendered, and every text segment is escaped before insertion.
export function ocrEvidenceText(match) {
  const text=match?.text;
  if (typeof text!=='string') return '';
  const base=match.offset, regions=match.ocrSource?.regions;
  if (!Number.isInteger(base)||!Array.isArray(regions)||regions.length>16) return escape(text);
  let pos=0, out='';
  for (const r of regions) {
    if (!r || !Number.isInteger(r.start)||!Number.isInteger(r.end)) return escape(text);
    const a=Math.max(0,r.start-base), b=Math.min(text.length,r.end-base);
    if(a>=b)continue;
    if(a<pos) return escape(text);
    out+=escape(text.slice(pos,a))+'<mark class="ocr-word">'+escape(text.slice(a,b))+'</mark>';pos=b;
  }
  return out+escape(text.slice(pos));
}
/** Historical approved excerpts, not model-authored citation claims. No bridge calls. */
export function knowledgeEvidence(chat, runId, documents = [], opened = new Set()) {
  const rows = (chat?.knowledgeEvidence || []).filter(r => r.runId === runId);
  if (!rows.length) return '';
  return `<section class="knowledge-evidence" aria-label="本轮知识检索依据"><h4>本轮检索依据</h4><p>工具实际返回的历史原文片段；不代表回复中的每项结论均已核实。展开不会再次读取文件或发送模型。</p>${rows.map((r,i) => `<div class="evidence-search"><small>检索 ${i+1} · ${r.matches.length} 个片段${r.resultLimited?' · 结果达到数量或长度上限':''}${r.sources.some(s=>s.sourceTruncated)?' · 部分来源提取不完整':''}</small>${r.matches.length?r.matches.map((m,j)=>{
    const s=m.source, live=documents.find(d=>d.id===s.id);
    const status=!live?'来源已移除 · 仅历史快照':live.revision!==s.revision||live.sha256!==s.sha256?'来源已更新 · 仅历史快照':'与当前文档版本一致';
    const key = 'knowledge:'+runId+':'+r.time+':'+i+':'+j;
    const ref=JSON.stringify({chatId:chat.id,row:chat.knowledgeEvidence.indexOf(r),match:j,runId:r.runId,time:r.time,expectedHash:m.ocrSource?.sha256});
    return `<details class="evidence-card" data-detail="${escape(key)}" ${opened.has(key)?'open':''}><summary><b>${escape(s.name)}</b> · v${s.revision} · 第 ${m.line}–${m.endLine} 行 <span>${status}</span></summary><p class="evidence-location">提取文本坐标 ${m.offset}–${m.endOffset}（UTF-16）；Office 行号不是页码或单元格。</p>${m.ocrSource ? `<p>原 PDF：${escape(m.ocrSource.name)} · 第 ${escape(Array.isArray(m.ocrSource.pages) ? m.ocrSource.pages.join('、') : '')} 页<br>原 PDF SHA-256：${escape(m.ocrSource.sha256)}<br>机器识别可能有误，请对照原文件。</p><button type="button" data-action="openOcrSource" data-id="${escape(ref)}">选择并核对原 PDF</button>${m.ocrSource?.regions?.length?`<button type="button" data-action="previewOcrSource" data-id="${escape(ref)}">查看原页与定位</button>`:""}<small>核对后由系统打开文件；请自行翻到上述页码。</small>` : ''}${m.ocrSource?.regions?.length?'<p>标记的文字具有页面定位数据；标记不表示识别或答案已核实。'+(m.ocrSource.regionsTruncated?'部分定位未包含。':'')+'</p>':''}<pre>${ocrEvidenceText(m)}</pre><small>文档 ID：${escape(s.id)}<br>文件 SHA-256：${escape(s.sha256)}</small></details>`;
  }).join(''):'<p class="evidence-empty">当前提取文本没有匹配片段，不表示事实不存在。</p>'}</div>`).join('')}<small>只保留最近 12 次检索，完整记录总量上限 96000 字符；早期片段可能已清理。更改智能体绑定不会删除已保存的对话快照。</small></section>`;
}
