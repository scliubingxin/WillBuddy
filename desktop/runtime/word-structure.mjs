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
function structureReason(part, p) {
  if (part !== "word/document.xml" || !is(p.parentNode, "body")) return "仅支持正文顶层段落增删，表格和页眉页脚结构保留";
  const why = reason(p);
  if (why) return why;
  // Numbering, sections and tracked paragraph properties carry document-wide semantics.
  const properties = children(p, "pPr");
  if (properties.length > 1) return "重复段落属性只读";
  const pr = properties[0];
  if (pr && ["sectPr", "numPr", "pPrChange", "pStyle"].some(n => pr.getElementsByTagNameNS(W, n).length))
    return "带分节、编号或修订属性的段落结构只读";
  // Protect a plain-looking paragraph inside a field or cross-paragraph annotation range.
  const open = new Set(); let fieldDepth = 0;
  const scan = n => {
    if (n === p) return true;
    if (n.nodeType === 1 && n.namespaceURI === W) {
      const name = n.localName;
      if (name === "fldChar") {const t=attr(n,"fldCharType");if(t === "begin")fieldDepth++;if(t === "end")fieldDepth=Math.max(0,fieldDepth-1);}
      if (["bookmarkStart","commentRangeStart","moveFromRangeStart","moveToRangeStart","permStart"].includes(name))open.add(name.replace(/Start$/,"")+":"+attr(n,"id"));
      if (["bookmarkEnd","commentRangeEnd","moveFromRangeEnd","moveToRangeEnd","permEnd"].includes(name))open.delete(name.replace(/End$/,"")+":"+attr(n,"id"));
    }
    for(const child of Array.from(n.childNodes || []))if(scan(child))return true;
    return false;
  };
  scan(p.ownerDocument.documentElement);
  if(fieldDepth || open.size) return "跨段域、书签或批注范围内结构只读";
  return "";
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
    structural: !structureReason(part, p),
    structuralReason: structureReason(part, p),
    editable: !why,
    reason: why,
    runs,
  };
}
export function wordStructure(bytes) {
  const { docs } = context(bytes),
    paragraphs = [];
  const count = [...docs.values()].reduce((n,d) => n+d.getElementsByTagNameNS(W,"p").length,0);
  if(count > 500) throw Error("分段编辑最多500段，请使用外部Office处理长文档");
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
    scope: "文字/粗体/斜体和简单正文段落增删；继承样式不解析，非分页预览",
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
    seen = new Set(), structural = new Set();
  let changes = 0;
  // Validate every coordinate against the original snapshot before modifying any XML.
  const edits = patches.map((x) => {
    if (x?.action) {
      if (!["insertAfter", "deleteParagraph"].includes(x.action) || Object.keys(x).some(k => !["action","part","paragraph","anchor","text"].includes(k)))
        throw Error("未知Word结构修改字段");
      const p = structure.paragraphs.find(p => p.part === x.part && p.paragraph === x.paragraph);
      const key = x.part + ":" + x.paragraph;
      if (!Number.isInteger(x.paragraph) || !p?.structural || x.anchor !== p.anchor || structural.has(key))
        throw Error("Word段落坐标失效、结构只读或重复，请重新读取");
      if (x.action === "insertAfter") {
        if (typeof x.text !== "string" || !x.text.trim() || x.text.length > 10000 || /[\u0000-\u001f]/.test(x.text) || decode(encode(x.text)) !== x.text)
          throw Error("新段落必须为有效单行非空文本，最多10000字符");
      } else if ("text" in x) throw Error("删除段落不能同时提交文字");
      structural.add(key);
      return { ...x, node: docs.get(x.part).getElementsByTagNameNS(W,"p")[x.paragraph] };
    }
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
  const deleted = new Set(edits.filter(x => x.action === "deleteParagraph").map(x => x.part + ":" + x.paragraph));
  if (edits.some(x => !x.action && deleted.has(x.part + ":" + x.paragraph))) throw Error("不能同时删除段落并修改其片段");
  const body = docs.get("word/document.xml")?.getElementsByTagNameNS(W,"body")[0];
  if (body && children(body,"p").length - deleted.size < 1) throw Error("至少保留一个原正文段落");
  // Apply text patches before structural changes; retained node references prevent index drift.
  for (const x of edits.filter(x => !x.action)) {
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
  for (const x of edits.filter(x => x.action)) {
    const doc = docs.get(x.part), p = x.node;
    if (x.action === "deleteParagraph") p.parentNode.removeChild(p);
    else {
      const n = doc.createElementNS(W,"w:p");
      const pr = children(p,"pPr")[0];
      if (pr) n.appendChild(pr.cloneNode(true));
      const run = doc.createElementNS(W,"w:r"), rpr = children(children(p,"r")[0],"rPr")[0];
      if (rpr) run.appendChild(rpr.cloneNode(true));
      const t = doc.createElementNS(W,"w:t");t.setAttributeNS("http://www.w3.org/XML/1998/namespace","xml:space","preserve");t.textContent=x.text;run.appendChild(t);n.appendChild(run);
      p.parentNode.insertBefore(n,p.nextSibling);
    }
    changed.add(x.part);changes++;
  }
  const preservedParts = [];
  for (const [part, data] of Object.entries(files))
    if (!changed.has(part)) preservedParts.push({ part, sha256: sha256(data) });
  for (const part of changed) files[part] = encode(serialize(docs.get(part)));
  const output = Buffer.from(zip.zipSync(files)),
    result = inspectDocument("docx", output);
  wordStructure(output); // Recheck final paragraph/run bounds before publishing a candidate.
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
