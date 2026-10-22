import { escape } from "./markdown.js";
export function documentLibrary({ state, action, date }) {
  return `<section aria-label="可编辑文档"><div class="section-head"><h2>文档工作台</h2><div>${action("新建文档", "documentNew", "", "primary")}${action("导入文档", "documentImport")}</div></div><p class="description">在对话中让 AI 创建或修改 Word、Excel、PowerPoint、Markdown、HTML。导入原件保持不变，修改保存版本后再导出。Office 为提取文本预览，非保真排版；宏、外链与含公式工作簿修改暂不支持。</p><div class="cards">${(state.documents || []).map((d) => `<article class="card" data-document="${escape(d.id)}"><span class="badge">${escape(d.format.toUpperCase())} · v${d.revision}</span><h3>${escape(d.name)}</h3><p>${escape(d.text.slice(0, 120))}</p><small>${date(d.time)} · ${d.size} 字节 · 保留 ${d.history.length} 个前版</small><div class="actions">${action("预览", "documentView", d.id)}${action("编辑内容", "documentEditor", d.id)}${action("GenOffice 编辑", "documentGenOffice", d.id)}${action("收回编辑结果", "documentGenOfficeImport", d.id)}${action("AI 修改", "documentContinue", d.id)}${action("精确修改", "documentEdit", d.id)}${action("导出文件", "documentExport", d.id)}${d.history.length ? action("历史版本", "documentHistory", d.id) : ""}${action("删除文档", "documentDelete", d.id)}</div></article>`).join("") || "<p>创建第一份可编辑、可下载的文档。</p>"}</div></section>`;
}
export const documentExamples = {
  docx: JSON.stringify(
    {
      title: "项目方案",
      blocks: [
        { type: "heading", text: "目标" },
        { type: "paragraph", text: "请描述目标和执行步骤。" },
        {
          type: "table",
          rows: [
            ["阶段", "负责人"],
            ["启动", "待定"],
          ],
        },
      ],
    },
    null,
    2,
  ),
  xlsx: JSON.stringify(
    {
      sheets: [
        {
          name: "计划",
          rows: [
            ["任务", "预算", "完成"],
            ["调研", 1000, false],
          ],
        },
      ],
    },
    null,
    2,
  ),
  pptx: JSON.stringify(
    {
      slides: [
        {
          title: "项目方案",
          bullets: ["业务目标", "执行计划", "验收标准"],
          notes: "演讲备注",
        },
      ],
    },
    null,
    2,
  ),
  md: "# 项目方案\n\n## 目标\n\n请描述目标。",
  html: '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>项目方案</title></head><body><h1>项目方案</h1><p>请描述目标。</p></body></html>',
};

export function messageDocuments(state,chat,message) {
  const refs=[...(chat?.documentRefs||[]).filter(r=>r.runId===message.runId),
    ...(state.executions||[]).filter(r=>r.chatId===chat?.id&&r.runId===message.runId&&['document_create','document_edit'].includes(r.tool)&&r.status==='succeeded'&&r.result?.verified===true).map(r=>r.result.document)];
  return [...new Set(refs.map(r=>r.id))].map(id=>(state.documents||[]).find(d=>d.id===id)).filter(Boolean);
}
export function documentCards(documents,action) {
  return documents.length?`<section class="document-results" aria-label="已生成的文档">${documents.map(d=>`<div class="document-result"><b>${escape(d.name)}.${escape(d.format)}</b><small>真实文件 · v${d.revision} · ${d.size} 字节</small><div>${action('预览文件','documentView',d.id)}${action('编辑内容','documentEditor',d.id)}${action('下载 '+d.format.toUpperCase(),'documentExport',d.id,'primary')}</div></div>`).join('')}</section>`:'';
}
