import createDOMPurify from "../vendor/purify.js";
const tags = [
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "span",
  "div",
];
export function mountWordCanvas(container, source) {
  const doc = container.ownerDocument,
    clean = createDOMPurify(doc.defaultView);
  const sanitize = (html) =>
    clean.sanitize(html, {
      ALLOWED_TAGS: tags,
      ALLOWED_ATTR: ["colspan", "rowspan"],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
    });
  container.innerHTML =
    '<div class="word-toolbar" role="toolbar" aria-label="Word格式">' +
    [
      ["bold", "粗体"],
      ["italic", "斜体"],
      ["formatBlock", "标题"],
      ["paragraph", "正文"],
      ["insertUnorderedList", "列表"],
      ["table", "插入表格"],
      ["undo", "撤销"],
      ["redo", "重做"],
    ]
      .map(
        ([cmd, label]) =>
          `<button type="button" data-word-command="${cmd}">${label}</button>`,
      )
      .join("") +
    '</div><div class="word-canvas" role="textbox" aria-label="Word正文" aria-multiline="true" contenteditable="true"></div>';
  const body = container.querySelector(".word-canvas");
  body.innerHTML = sanitize(source);
  for (const button of container.querySelectorAll("[data-word-command]")) {
    button.onmousedown = (e) => e.preventDefault();
    button.onclick = () => {
      const selection = doc.getSelection();
      if (
        !selection?.rangeCount ||
        !body.contains(selection.anchorNode) ||
        !body.contains(selection.focusNode)
      ) {
        body.focus();
        const range = doc.createRange();
        range.selectNodeContents(body);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      const cmd = button.dataset.wordCommand;
      if (cmd === "table")
        doc.execCommand(
          "insertHTML",
          false,
          "<table><tbody><tr><th>项目</th><th>说明</th></tr><tr><td>任务</td><td>待填写</td></tr></tbody></table><p><br></p>",
        );
      else if (cmd === "formatBlock" || cmd === "paragraph")
        doc.execCommand("formatBlock", false, cmd === "paragraph" ? "p" : "h2");
      else doc.execCommand(cmd, false);
    };
  }
  body.onpaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData?.getData("text/html");
    const plain = e.clipboardData?.getData("text/plain") || "";
    if (html) doc.execCommand("insertHTML", false, sanitize(html));
    else doc.execCommand("insertText", false, plain);
  };
  body.ondrop = (e) => e.preventDefault();
  return {
    html() {
      if (body.innerHTML.length > 100000) throw Error("画布内容超过100000字符");
      return sanitize(body.innerHTML);
    },
  };
}
