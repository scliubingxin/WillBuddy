import { escape } from "./markdown.js";
/** Plain text spans only: renderer never accepts arbitrary OOXML or generates anchors. */
export function mountWordRuns(root, editor) {
  const runs = new Map(), structures = new Map();
  let focused;
  root.innerHTML = `<p>直接编辑文字片段；先点击片段，再用工具栏设置粗体/斜体。简单正文支持在后面插入段落或标记删除；保存前可撤销。表格/页眉页脚结构和复杂段落只读。继承样式不解析；这里不是分页排版预览。灰色段落只读。</p><div class="word-run-toolbar"><button type="button" data-word-mark="bold"><b>B</b> 粗体</button><button type="button" data-word-mark="italic"><i>I</i> 斜体</button><span role="status">点击一个文字片段开始编辑</span></div><div class="word-import-page">${editor.paragraphs
    .map((p, i) => {
      const label = `${p.part} · 段落 ${p.paragraph + 1}`;
      if (!p.editable)
        return `<section class="word-readonly"><small>${escape(label)} · ${escape(p.reason)}</small><p>${escape(p.text) || "（非文字内容）"}</p></section>`;
      return `<section class="word-run-paragraph" data-word-paragraph="${i}"><small>${escape(label)}</small>${p.structural ? `<div class="word-structure-controls"><button type="button" data-word-insert="${i}">后插段落</button><button type="button" data-word-delete="${i}">删除本段</button><button type="button" data-word-undo="${i}" hidden>撤销段落操作</button></div><textarea data-word-new="${i}" aria-label="${escape(label)} 后插段落文字" placeholder="输入新段落内容，保存后生效" hidden></textarea>` : ""}<p>${p.runs
        .map((r) => {
          const key = i + ":" + r.run;
          runs.set(key, {
            p,
            r,
            current: { text: r.text, bold: r.bold, italic: r.italic },
          });
          return `<span contenteditable="plaintext-only" role="textbox" aria-label="${escape(label)} 片段 ${r.run + 1}" data-word-run="${key}" spellcheck="false" style="font-weight:${r.bold ? "700" : "400"};font-style:${r.italic ? "italic" : "normal"}">${escape(r.text)}</span>`;
        })
        .join("")}</p></section>`;
    })
    .join("")}</div>`;
  const status = root.querySelector('[role="status"]');
  for (const node of root.querySelectorAll("[data-word-run]")) {
    node.addEventListener("focus", () => {
      focused = node;
      status.textContent = node.getAttribute("aria-label");
    });
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault();
    });
    node.addEventListener("paste", (e) => {
      e.preventDefault();
      const s = (e.clipboardData?.getData("text/plain") || "").replace(
        /[\r\n\t]/g,
        " ",
      );
      root.ownerDocument.execCommand("insertText", false, s);
    });
    node.addEventListener("drop", (e) => e.preventDefault());
    node.addEventListener("input", () => {
      runs.get(node.dataset.wordRun).current.text = node.textContent;
    });
  }
  for (const b of root.querySelectorAll("[data-word-mark]")) {
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      if (!focused) {
        status.textContent = "请先点击需要修改的文字片段";
        return;
      }
      const v = runs.get(focused.dataset.wordRun).current,
        k = b.dataset.wordMark;
      v[k] = !v[k];
      focused.style[k === "bold" ? "fontWeight" : "fontStyle"] =
        k === "bold" ? (v[k] ? "700" : "400") : v[k] ? "italic" : "normal";
      b.setAttribute("aria-pressed", String(v[k]));
      focused.focus();
    });
  }
  for (const b of root.querySelectorAll("[data-word-insert],[data-word-delete],[data-word-undo]")) {
    b.addEventListener("click", () => {
      const i = b.dataset.wordInsert ?? b.dataset.wordDelete ?? b.dataset.wordUndo;
      const section = root.querySelector(`[data-word-paragraph="${i}"]`), p = editor.paragraphs[Number(i)];
      const input = section.querySelector("textarea"), undo = section.querySelector("[data-word-undo]");
      const action = b.hasAttribute("data-word-insert") ? "insertAfter" : b.hasAttribute("data-word-delete") ? "deleteParagraph" : null;
      if (action) structures.set(i,{action,part:p.part,paragraph:p.paragraph,anchor:p.anchor});else structures.delete(i);
      input.hidden = action !== "insertAfter";undo.hidden = !action;
      section.classList.toggle("word-deleted",action === "deleteParagraph");
      for (const node of section.querySelectorAll("[data-word-run]")) node.setAttribute("contenteditable",action === "deleteParagraph" ? "false" : "plaintext-only");
      status.textContent = action === "deleteParagraph" ? "已标记删除本段；保存前可撤销" : action === "insertAfter" ? "填写新段落；保存后生效" : "已撤销段落操作";
      if (!input.hidden) input.focus();
    });
  }
  return {
    patches() {
      const paragraphPatches = [...structures.entries()].map(([i,x]) => x.action === "insertAfter" ? {...x,text:root.querySelector(`[data-word-new="${i}"]`).value} : x);
      return [...paragraphPatches, ...[...runs.values()].flatMap(({ p, r, current }) => {
        if (paragraphPatches.some(x => x.action === "deleteParagraph" && x.part === p.part && x.paragraph === p.paragraph)) return [];
        const patch = {
          part: p.part,
          paragraph: p.paragraph,
          run: r.run,
          anchor: r.anchor,
        };
        for (const k of ["text", "bold", "italic"])
          if (current[k] !== r[k]) patch[k] = current[k];
        return Object.keys(patch).length > 4 ? [patch] : [];
      })];
    },
  };
}
