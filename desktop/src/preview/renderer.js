import {installOfficeSelection} from './office-selection.js';
import { renderAsync } from "docx-preview";
import {
  PptxViewer,
  RECOMMENDED_ZIP_LIMITS,
} from "@aiden0z/pptx-renderer/browser";
import { unzipSync, strFromU8 } from "fflate";
import SSF from "ssf";
import { sheetImages, imageBox } from "./spreadsheet-images.js";
const token = location.hash.slice(1),
  content = document.querySelector("#content"),
  status = document.querySelector("#status");
let used = false;
const imageURLs = [];
const releaseImages = () => {
  for (const url of imageURLs) URL.revokeObjectURL(url);
  imageURLs.length = 0;
};
window.addEventListener("pagehide", releaseImages);
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const nodes = (e, n) => [...e.getElementsByTagNameNS(NS, n)];
const text = (e, n) => nodes(e, n)[0]?.textContent || "";
const col = (a) =>
  [...a.replace(/[0-9]/g, "")].reduce(
    (n, c) => n * 26 + c.charCodeAt(0) - 64,
    0,
  );
const rgb = (e) =>
  /^[a-f0-9]{8}$/i.test(e?.getAttribute("rgb") || "")
    ? "#" + e.getAttribute("rgb").slice(2)
    : "";
async function spreadsheet(bytes) {
  const files = unzipSync(bytes),
    parse = (p) => {
      if (!files[p]) throw Error("工作簿部件缺失");
      return new DOMParser().parseFromString(
        strFromU8(files[p]),
        "application/xml",
      );
    };
  const imageBudget = { count: 0, pixels: 0 };
  const book = parse("xl/workbook.xml"),
    rels = parse("xl/_rels/workbook.xml.rels");
  const targets = new Map(
    [...rels.getElementsByTagName("Relationship")].map((e) => [
      e.getAttribute("Id"),
      e.getAttribute("Target"),
    ]),
  );
  const shared = files["xl/sharedStrings.xml"]
    ? nodes(parse("xl/sharedStrings.xml"), "si").map((e) =>
        nodes(e, "t")
          .map((t) => t.textContent)
          .join(""),
      )
    : [];
  const styles = files["xl/styles.xml"] ? parse("xl/styles.xml") : null;
  const styleList = (n) => (styles ? nodes(styles, n)[0]?.children || [] : []);
  const fonts = styleList("fonts"),
    fills = styleList("fills"),
    borders = styleList("borders"),
    xfs = styleList("cellXfs");
  const fmts = new Map(
    styles
      ? nodes(styles, "numFmt").map((e) => [
          e.getAttribute("numFmtId"),
          e.getAttribute("formatCode"),
        ])
      : [],
  );
  const sheets = nodes(book, "sheet");
  if (sheets.length > 10) throw Error("超过10张表，请拆分文件");
  const tabs = document.createElement("nav");
  content.append(tabs);
  for (const [index, sheet] of sheets.entries()) {
    const id = sheet.getAttributeNS(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "id",
      ),
      target = targets.get(id);
    if (!target) throw Error("工作表关系缺失");
    const part = target.startsWith("/")
      ? target.slice(1)
      : "xl/" + target.replace(/^\.\//, "");
    if (part.includes("..")) throw Error("工作表路径不支持");
    const doc = parse(part),
      cells = nodes(doc, "c"),
      map = new Map();
    let rows = 0,
      columns = 0;
    for (const cell of cells) {
      const a = cell.getAttribute("r");
      if (!/^[A-Z]{1,3}[1-9][0-9]*$/.test(a)) throw Error("坐标无效");
      rows = Math.max(rows, Number(a.match(/[0-9]+/)[0]));
      columns = Math.max(columns, col(a));
      map.set(a, cell);
    }
    const merges = nodes(doc, "mergeCell").map((e) =>
      e
        .getAttribute("ref")
        .split(":")
        .map((a) => ({ r: Number(a.match(/[0-9]+/)[0]), c: col(a) })),
    );
    for (const m of merges) {
      rows = Math.max(rows, m[1].r);
      columns = Math.max(columns, m[1].c);
    }
    const drawing = sheetImages(files, part, doc, parse, imageBudget);
    for (const image of drawing.images)
      for (const marker of [image.from, image.to])
        if (marker) {
          rows = Math.max(rows, marker.row + 1);
          columns = Math.max(columns, marker.col + 1);
        }
    if (drawing.images.length) {
      rows = Math.max(rows, 1);
      columns = Math.max(columns, 1);
    }
    if (rows > 5000 || columns > 128 || rows * columns > 30000)
      throw Error("超过完整预览范围（5000行/128列/30000网格），请拆分文件");
    const button = document.createElement("button");
    button.textContent = sheet.getAttribute("name");
    tabs.append(button);
    const section = document.createElement("section");
    section.className = "spreadsheet-sheet";
    section.style.position = "relative";
    content.append(section);
    button.onclick = () => {
      for (const s of content.querySelectorAll("section"))
        s.hidden = s !== section;
    };
    const table = document.createElement("table"),
      group = document.createElement("colgroup");
    table.append(group);
    const rowMap = new Map(
      nodes(doc, "row").map((e) => [Number(e.getAttribute("r")), e]),
    );
    for (let c = 1; c <= columns; c++) {
      const el = document.createElement("col"),
        spec = nodes(doc, "col").find(
          (e) =>
            Number(e.getAttribute("min")) <= c &&
            Number(e.getAttribute("max")) >= c,
        );
      el.style.width =
        Math.min(
          1000,
          Math.max(20, Number(spec?.getAttribute("width") || 10) * 7),
        ) + "px";
      if (spec?.getAttribute("hidden") === "1")
        el.style.visibility = "collapse";
      group.append(el);
    }
    for (let r = 1; r <= rows; r++) {
      const tr = document.createElement("tr"),
        row = rowMap.get(r);
      if (row?.getAttribute("ht"))
        tr.style.height = (Number(row.getAttribute("ht")) * 96) / 72 + "px";
      if (row?.getAttribute("hidden") === "1") tr.hidden = true;
      table.append(tr);
      for (let c = 1; c <= columns; c++) {
        const m = merges.find(
          (m) => r >= m[0].r && r <= m[1].r && c >= m[0].c && c <= m[1].c,
        );
        if (m && (r !== m[0].r || c !== m[0].c)) continue;
        let n = c,
          a = "";
        while (n) {
          n--;
          a = String.fromCharCode(65 + (n % 26)) + a;
          n = Math.floor(n / 26);
        }
        a += r;
        const td = document.createElement("td");
        tr.append(td);
        td.dataset.address = a;
        td.title = a;
        if (m) {
          td.rowSpan = m[1].r - r + 1;
          td.colSpan = m[1].c - c + 1;
        }
        const cell = map.get(a);
        if (!cell) continue;
        const type = cell.getAttribute("t"),
          raw = text(cell, "v");
        let value =
          type === "s"
            ? shared[Number(raw)] || ""
            : type === "inlineStr"
              ? nodes(cell, "t")
                  .map((e) => e.textContent)
                  .join("")
              : type === "b"
                ? raw === "1"
                  ? "TRUE"
                  : "FALSE"
                : raw;
        const xf = xfs[Number(cell.getAttribute("s") || 0)],
          font = fonts[Number(xf?.getAttribute("fontId") || 0)],
          fill = fills[Number(xf?.getAttribute("fillId") || 0)],
          border = borders[Number(xf?.getAttribute("borderId") || 0)],
          alignment = xf && nodes(xf, "alignment")[0];
        if (
          (type === null || type === "n") &&
          raw !== "" &&
          Number.isFinite(Number(raw))
        )
          try {
            const id = xf?.getAttribute("numFmtId") || "0";
            value = SSF.format(fmts.get(id) || Number(id), Number(raw), {
              date1904:
                nodes(book, "workbookPr")[0]?.getAttribute("date1904") === "1",
            });
          } catch {}
        if (nodes(cell, "f").length) {
          td.title += " =" + text(cell, "f");
          if (raw === "") value = "[公式无缓存]";
        }
        td.textContent = value;
        Object.assign(td.style, {
          fontWeight: font && nodes(font, "b").length ? "bold" : "",
          fontStyle: font && nodes(font, "i").length ? "italic" : "",
          fontSize:
            font && nodes(font, "sz")[0]?.getAttribute("val")
              ? (Number(nodes(font, "sz")[0].getAttribute("val")) * 96) / 72 +
                "px"
              : "",
          color: font ? rgb(nodes(font, "color")[0]) : "",
          backgroundColor: fill ? rgb(nodes(fill, "fgColor")[0]) : "",
          textAlign: ["left", "right", "center", "justify"].includes(
            alignment?.getAttribute("horizontal"),
          )
            ? alignment.getAttribute("horizontal")
            : "",
          verticalAlign:
            alignment?.getAttribute("vertical") === "center" ? "middle" : "top",
          whiteSpace:
            alignment?.getAttribute("wrapText") === "1" ? "pre-wrap" : "pre",
          textDecoration: font && nodes(font, "u").length ? "underline" : "",
        });
        for (const side of ["top", "bottom", "left", "right"]) {
          const edge = border && nodes(border, side)[0];
          if (edge?.getAttribute("style"))
            td.style["border" + side[0].toUpperCase() + side.slice(1)] =
              "1px solid " + (rgb(nodes(edge, "color")[0]) || "#555");
        }
      }
    }
    section.append(table);
    if (drawing.unsupported) {
      const warning = document.createElement("p");
      warning.textContent =
        drawing.unsupported + "个非图片绘图/复杂对象暂未渲染";
      section.append(warning);
    }
    const x = [0],
      y = [0];
    for (const c of group.children)
      x.push(x.at(-1) + c.getBoundingClientRect().width);
    for (const r of table.rows)
      y.push(y.at(-1) + r.getBoundingClientRect().height);
    for (const image of drawing.images) {
      const box = imageBox(image, x, y),
        img = document.createElement("img");
      img.alt = "工作表图片";
      img.className = "spreadsheet-image";
      img.dataset.anchor = image.kind;
      img.dataset.part = image.part;
      const url = URL.createObjectURL(
        new Blob([image.data], { type: image.mime }),
      );
      imageURLs.push(url);
      img.src = url;
      Object.assign(img.style, {
        position: "absolute",
        left: box.left + "px",
        top: box.top + "px",
        width: box.width + "px",
        height: box.height + "px",
        maxWidth: "none",
        pointerEvents: "none",
      });
      section.append(img);
      await img.decode();
      section.style.minWidth =
        Math.max(table.getBoundingClientRect().width, box.left + box.width) +
        "px";
      section.style.minHeight =
        Math.max(table.getBoundingClientRect().height, box.top + box.height) +
        "px";
    }
    section.hidden = index !== 0;
  }
}
document.addEventListener(
  "click",
  (e) => {
    if (e.target.closest("a")) e.preventDefault();
  },
  true,
);
window.addEventListener("message", async (e) => {
  if (
    e.source !== parent ||
    e.data?.token !== token ||
    e.data?.kind !== "document" ||
    used
  )
    return;
  used = true;
  try {
    const { format, base64 } = e.data;
    if (
      !["docx", "xlsx", "pptx"].includes(format) ||
      typeof base64 !== "string" ||
      base64.length > 5600000
    )
      throw Error("预览数据无效");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (format === "docx")
      await renderAsync(bytes, content, null, {
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderAltChunks: false,
        ignoreLastRenderedPageBreak: false,
        useBase64URL: true,
      });
    if (format === "docx") installOfficeSelection(content,token);
    if (format === "xlsx") await spreadsheet(bytes);
    if (format === "pptx")
      await PptxViewer.open(bytes.buffer, content, {
        pdfjs: false,
        zipLimits: RECOMMENDED_ZIP_LIMITS,
        listOptions: { windowed: false },
      });
    status.textContent =
      "离线静态预览 · Excel 图表/条件格式、动画及复杂对象暂不支持；公式显示缓存值，图片位置、字体及分页可能与 Office 不同。";
    document.body.dataset.ready = "true";
  } catch (err) {
    status.textContent = "无法完整预览：" + err.message;
    releaseImages();
    content.replaceChildren();
    document.body.dataset.error = "true";
  } finally {
    parent.postMessage({ kind: "office-complete", token }, "*");
  }
});
parent.postMessage({ kind: "office-ready", token }, "*");
