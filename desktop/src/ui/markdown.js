import { mediaUrl, mediaType } from "./media-policy.js";
import { chartSpec, chartFigure } from "./charts.js";
import { Marked } from "../vendor/marked.js";
import createDOMPurify from "../vendor/purify.js";
export const escape = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const parser = new Marked({ gfm: true, breaks: true });
parser.use({
  renderer: {
    code(token) {
      if (token.lang?.trim() === "chart" && /\n[ \t]*`{3,}\s*$/.test(token.raw))
        return (
          '<pre><code title="willbuddy-chart">' +
          escape(token.text) +
          "</code></pre>"
        );
      return false;
    },
  },
});
const tags = [
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "b",
  "i",
  "s",
  "del",
  "u",
  "a",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "div",
  "span",
  "section",
  "article",
  "header",
  "footer",
  "small",
  "details",
  "summary",
  "dl",
  "dt",
  "dd",
  "kbd",
  "sup",
  "sub",
  "abbr",
  "img",
  "input",
  "video",
  "source",
];
const attrs = [
  "src",
  "href",
  "title",
  "alt",
  "colspan",
  "rowspan",
  "align",
  "start",
  "reversed",
  "open",
  "type",
  "checked",
];
const config = {
  ALLOWED_TAGS: tags,
  ALLOWED_ATTR: attrs,
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  FORBID_TAGS: [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "form",
    "button",
    "textarea",
    "select",
    "option",
    "svg",
    "math",
    "template",
    "meta",
    "link",
    "base",
  ],
  SANITIZE_NAMED_PROPS: true,
};
export function extractHtml(content) {
  const text = String(content || "");
  const fenced = text.match(
    /(?:^|\n)\s*```html[^\n]*\n([\s\S]*?)(?:\n\s*```|$)/i,
  );
  return fenced
    ? fenced[1]
    : /^\s*(?:<!doctype\s+html|<html[\s>]|<body[\s>]|<(?:div|section|article|table|h[1-6]|p)[\s>])/i.test(
          text,
        )
      ? text
      : null;
}
export function createRich(window) {
  const purifier = createDOMPurify(window);
  function sanitize(source, { links = true, preview = false } = {}) {
    const settings = preview
      ? {
          ...config,
          ALLOWED_TAGS: [...tags, "style"],
          ALLOWED_ATTR: [...attrs, "style", "class", "id"],
          FORBID_TAGS: config.FORBID_TAGS.filter((tag) => tag !== "style"),
          FORCE_BODY: true,
          SANITIZE_NAMED_PROPS: false,
        }
      : config;
    const fragment = purifier.sanitize(source, {
      ...settings,
      RETURN_DOM_FRAGMENT: true,
    });
    for (const link of fragment.querySelectorAll("a")) {
      const href = link.getAttribute("href") || "";
      if (
        !links ||
        !/^https?:\/\//i.test(href) ||
        /[\u0000-\u0020]/.test(href)
      ) {
        link.removeAttribute("href");
      } else {
        try {
          const url = new URL(href);
          if (url.username || url.password) link.removeAttribute("href");
          else {
            link.className = "rendered-link";
            link.rel = "noopener noreferrer";
          }
        } catch {
          link.removeAttribute("href");
        }
      }
    }
    let mediaCount = 0;
    const mediaCard = (kind, src, label) => {
      const url = mediaUrl(src),
        card = window.document.createElement("figure");
      card.className = "chat-media";
      const caption = window.document.createElement("figcaption");
      caption.textContent = label || (kind === "video" ? "视频" : "图片");
      card.append(caption);
      if (!url || ++mediaCount > 12) {
        const note = window.document.createElement("span");
        note.textContent = !url
          ? "媒体地址不支持，请使用公开 HTTPS 直链"
          : "本条消息最多展示12项媒体";
        card.append(note);
        return card;
      }
      const button = window.document.createElement("button");
      button.type = "button";
      button.className = "media-load";
      button.dataset.mediaUrl = url;
      button.dataset.mediaKind = kind;
      button.textContent = kind === "video" ? "加载视频" : "查看图片";
      const note = window.document.createElement("small");
      note.textContent =
        new URL(url).hostname + " · 点击后联网加载，不自动播放";
      const source = window.document.createElement("a");
      source.className = "rendered-link";
      source.href = url;
      source.rel = "noopener noreferrer";
      source.textContent = "打开原始链接";
      card.append(button, note, source);
      return card;
    };
    for (const video of fragment.querySelectorAll("video")) {
      if (preview) video.replaceWith(window.document.createTextNode("[视频]"));
      else
        video.replaceWith(
          mediaCard(
            "video",
            video.getAttribute("src") ||
              video.querySelector("source")?.getAttribute("src"),
            video.getAttribute("title"),
          ),
        );
    }
    for (const source of fragment.querySelectorAll("source")) source.remove();
    for (const img of fragment.querySelectorAll("img")) {
      if (!preview) {
        img.replaceWith(mediaCard("image", img.getAttribute("src"), img.alt));
        continue;
      }
      const label = window.document.createElement("span");
      label.className = "media-placeholder";
      label.textContent = "[图片" + (img.alt ? "：" + img.alt : "") + "]";
      img.replaceWith(label);
    }
    if (!preview)
      for (const link of [...fragment.querySelectorAll("a[href]")]) {
        if (
          !link.closest(".chat-media") &&
          mediaType(link.href) &&
          mediaUrl(link.href)
        )
          link.replaceWith(mediaCard("video", link.href, link.textContent));
        else if (
          link.parentElement?.tagName === "P" &&
          link.parentElement.childNodes.length === 1
        ) {
          const box = window.document.createElement("aside"),
            host = window.document.createElement("small");
          box.className = "web-link-card";
          host.textContent = new URL(link.href).hostname;
          link.replaceWith(box);
          box.append(link, host);
        }
      }
    // User HTML classes/data attributes were removed before creating trusted controls.
    let chartCount = 0;
    if (!preview)
      for (const code of fragment.querySelectorAll(
        'pre > code[title="willbuddy-chart"]',
      )) {
        try {
          if (++chartCount > 6) throw Error("本条消息最多展示6张图表");
          code.parentElement.replaceWith(
            chartFigure(window.document, chartSpec(code.textContent)),
          );
        } catch (error) {
          const note = window.document.createElement("p");
          note.className = "chart-error";
          note.textContent = "图表未渲染：" + error.message;
          code.parentElement.after(note);
        }
      }
    for (const input of fragment.querySelectorAll("input")) {
      if (input.getAttribute("type") !== "checkbox") {
        input.remove();
        continue;
      }
      input.disabled = true;
      input.tabIndex = -1;
    }
    for (const table of [...fragment.querySelectorAll("table")]) {
      if (table.closest("table") !== table) continue;
      const wrap = window.document.createElement("div");
      wrap.className = "table-scroll";
      table.replaceWith(wrap);
      wrap.append(table);
    }
    for (const el of fragment.querySelectorAll("[src]"))
      el.removeAttribute("src");
    const wrapper = window.document.createElement("div");
    wrapper.append(fragment);
    return wrapper.innerHTML;
  }
  return {
    rich: (content) => sanitize(parser.parse(String(content || ""))),
    sanitizeHtml: sanitize,
  };
}
let browserRenderer;
export function rich(content) {
  browserRenderer ??= createRich(window);
  return browserRenderer.rich(content);
}
export function htmlPreview(content) {
  browserRenderer ??= createRich(window);
  const body = browserRenderer.sanitizeHtml(String(content), {
    links: false,
    preview: true,
  });
  return (
    "<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'\"><style>body{margin:24px;font:15px/1.8 -apple-system,BlinkMacSystemFont,\"PingFang SC\",sans-serif;color:#243447;background:white;overflow-wrap:anywhere}table{border-collapse:collapse}td,th{border:1px solid #dce5ee;padding:8px 12px}pre{white-space:pre;overflow:auto}.table-scroll{overflow:auto}</style></head><body>" +
    body +
    "</body></html>"
  );
}
