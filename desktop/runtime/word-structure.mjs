/** Targeted OOXML edits, never a rebuild of an imported document through HTML. */
import office from "./vendor/office.cjs";
import { openPackage, inspectDocument, sha256 } from "./documents.mjs";
const { DOMParser, XMLSerializer, zip } = office;
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const encode = (s) => new TextEncoder().encode(s);
const decode = (b) => new TextDecoder("utf-8", { fatal: true }).decode(b);
const serialize = (n) => new XMLSerializer().serializeToString(n);
const elements = (n) =>
  Array.from(n.childNodes).filter((x) => x.nodeType === 1);
const is = (n, name) => n.namespaceURI === W && n.localName === name;
const children = (n, name) => elements(n).filter((x) => is(x, name));
const attr = (n, name) => n?.getAttributeNS(W, name);
function parse(b) {
  return new DOMParser({
    onError: () => {
      throw Error("无效 Word XML");
    },
  }).parseFromString(decode(b), "application/xml");
}
function context(bytes) {
  inspectDocument("docx", bytes);
  const files = openPackage(bytes);
  if (
    Object.keys(files).some((n) =>
      n.toLowerCase().startsWith("_xmlsignatures/"),
    )
  )
    throw Error("带数字签名的Word请先在原应用中处理，不能编辑后保留失效签名");
  const docs = new Map(
    Object.keys(files)
      .filter((n) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(n))
      .sort()
      .map((n) => [n, parse(files[n])]),
  );
  return { files, docs };
}
function reason(p) {
  for (let n = p.parentNode; n?.nodeType === 1; n = n.parentNode)
    if (
      n.namespaceURI === W &&
      ["ins", "del", "moveFrom", "moveTo", "sdt", "customXml"].includes(
        n.localName,
      )
    )
      return "修订或内容控件中的段落只读";
  if (elements(p).some((n) => !is(n, "pPr") && !is(n, "r")))
    return "含链接、书签、域或其他复杂结构，只读保留";
  const runs = children(p, "r");
  if (!runs.length) return "空段落暂不插入文字";
  for (const r of runs) {
    if (
      elements(r).some((n) => !is(n, "rPr") && !is(n, "t")) ||
      children(r, "t").length !== 1 ||
      children(r, "rPr").length > 1
    )
      return "含图片、制表符、换行或复杂文字片段，只读保留";
    if (r.getElementsByTagNameNS(W, "rPrChange").length)
      return "含格式修订，只读保留";
  }
  return "";
}
function directMark(r, name) {
  const n = children(children(r, "rPr")[0] || { childNodes: [] }, name)[0];
  return n ? !["0", "false", "off"].includes(attr(n, "val")) : null;
}
function describe(part, p, index) {
  const why = reason(p),
    runs = why
      ? []
      : children(p, "r").map((r, run) => ({
          run,
          anchor: sha256(serialize(r)),
          text: children(r, "t")[0].textContent,
          bold: directMark(r, "b"),
          italic: directMark(r, "i"),
        }));
  return {
    part,
    paragraph: index,
    anchor: sha256(serialize(p)),
    text: Array.from(p.getElementsByTagNameNS(W, "t"))
      .map((n) => n.textContent)
      .join(""),
    editable: !why,
    reason: why,
    runs,
  };
}
export function wordStructure(bytes) {
  const { docs } = context(bytes),
    paragraphs = [];
  let runs = 0;
  for (const [part, doc] of docs)
    Array.from(doc.getElementsByTagNameNS(W, "p")).forEach((p, i) => {
      const d = describe(part, p, i);
      paragraphs.push(d);
      runs += d.runs.length;
    });
  if (paragraphs.length > 500 || runs > 2000)
    throw Error("分段编辑最多500段/2000个文字片段，请使用外部Office处理长文档");
  return {
    kind: "word-runs",
    paragraphs,
    scope: "直接文字/粗体/斜体；继承样式保留但不解析，非分页预览",
  };
}
function mark(doc, r, name, value) {
  let pr = children(r, "rPr")[0];
  if (!pr) {
    pr = doc.createElementNS(W, "w:rPr");
    r.insertBefore(pr, r.firstChild);
  }
  for (const n of children(pr, name)) pr.removeChild(n);
  const n = doc.createElementNS(W, "w:" + name);
  n.setAttributeNS(W, "w:val", value ? "1" : "0");
  // rPr order follows CT_RPr: b precedes bCs/i, i precedes iCs and later properties.
  const before =
    name === "b" ? ["rStyle", "rFonts"] : ["rStyle", "rFonts", "b", "bCs"];
  const next = elements(pr).find((x) => !before.includes(x.localName));
  pr.insertBefore(n, next || null);
}
export function patchWord(bytes, patches) {
  const structure = wordStructure(bytes),
    { files, docs } = context(bytes);
  if (!Array.isArray(patches) || !patches.length || patches.length > 100)
    throw Error("请提交1至100个文字片段修改");
  const changed = new Set(),
    seen = new Set();
  let changes = 0;
  // Validate every coordinate against the original snapshot before modifying any XML.
  const edits = patches.map((x) => {
    if (
      !x ||
      Object.keys(x).some(
        (k) =>
          ![
            "part",
            "paragraph",
            "run",
            "anchor",
            "text",
            "bold",
            "italic",
          ].includes(k),
      )
    )
      throw Error("未知Word修改字段");
    const p = structure.paragraphs.find(
        (p) => p.part === x.part && p.paragraph === x.paragraph,
      ),
      r = p?.runs.find((r) => r.run === x.run),
      key = x.part + ":" + x.paragraph + ":" + x.run;
    if (
      !Number.isInteger(x.paragraph) ||
      !Number.isInteger(x.run) ||
      !p?.editable ||
      !r ||
      r.anchor !== x.anchor ||
      seen.has(key)
    )
      throw Error("Word文字片段坐标失效、只读或重复，请重新读取");
    seen.add(key);
    if (
      "text" in x &&
      (typeof x.text !== "string" ||
        x.text.length > 10000 ||
        /[\u0000-\u001f]/.test(x.text) ||
        decode(encode(x.text)) !== x.text)
    )
      throw Error("文字片段必须为单行有效文本，最多10000字符");
    for (const k of ["bold", "italic"])
      if (k in x && typeof x[k] !== "boolean") throw Error("格式必须是布尔值");
    if (!["text", "bold", "italic"].some((k) => k in x && x[k] !== r[k]))
      throw Error("文字片段没有变化");
    return x;
  });
  for (const x of edits) {
    const doc = docs.get(x.part),
      p = doc.getElementsByTagNameNS(W, "p")[x.paragraph],
      r = children(p, "r")[x.run];
    if ("text" in x) {
      const t = children(r, "t")[0];
      t.textContent = x.text;
      t.setAttributeNS(
        "http://www.w3.org/XML/1998/namespace",
        "xml:space",
        "preserve",
      );
    }
    if ("bold" in x) mark(doc, r, "b", x.bold);
    if ("italic" in x) mark(doc, r, "i", x.italic);
    changed.add(x.part);
    changes++;
  }
  const preservedParts = [];
  for (const [part, data] of Object.entries(files))
    if (!changed.has(part)) preservedParts.push({ part, sha256: sha256(data) });
  for (const part of changed) files[part] = encode(serialize(docs.get(part)));
  const output = Buffer.from(zip.zipSync(files)),
    result = inspectDocument("docx", output);
  // Validate untouched part bytes again after re-encoding the ZIP, before approval/save.
  const checked = openPackage(output);
  for (const p of preservedParts)
    if (sha256(checked[p.part]) !== p.sha256) throw Error("未修改部件校验失败");
  return {
    bytes: output,
    ...result,
    changes,
    preservation: { changedParts: [...changed], preservedParts },
  };
}
