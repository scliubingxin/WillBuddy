import createDOMPurify from "../src/vendor/purify.js";
const purify = createDOMPurify(window);
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
  "sup",
  "sub",
];
const styles = new Set([
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-align",
  "text-decoration",
  "color",
  "background-color",
  "line-height",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-bottom",
  "padding",
  "border",
  "border-collapse",
  "width",
  "max-width",
]);
globalThis.willbuddyConversionHTML = (source) => {
  if (typeof source !== "string" || source.length > 100000)
    throw Error("转换原文最多100000字符");
  const fragment = purify.sanitize(source, {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: ["style", "colspan", "rowspan", "start"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  const elements = fragment.querySelectorAll("*");
  if (elements.length > 2000) throw Error("转换内容超过2000个元素");
  for (const element of elements)
    for (const property of [...element.style])
      if (
        !styles.has(property) ||
        /url\s*\(|expression|@|\\/i.test(
          element.style.getPropertyValue(property),
        )
      )
        element.style.removeProperty(property);
  const container = document.createElement("div");
  container.append(fragment);
  return (
    "<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'\"><style>body{margin:32px;background:white;color:#1f2937;font-family:sans-serif;font-size:14px;line-height:1.6}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px}h1,h2,h3{color:#0078CB}</style></head><body>" +
    container.innerHTML +
    "</body></html>"
  );
};
