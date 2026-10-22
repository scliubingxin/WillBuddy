/** Offline document codecs. No subprocess, Office installation, remote URL or macros. */
import office from "./vendor/office.cjs";
import { createHash } from "node:crypto";
const { word, PptxGenJS, zip, DOMParser, XMLSerializer } = office;
export const formats = ["docx", "xlsx", "pptx", "md", "html"];
function crc32(data) {
  let c = 0xffffffff;
  for (const b of data) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
const encoder = new TextEncoder(),
  decoder = new TextDecoder("utf-8", { fatal: true });
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  A = "http://schemas.openxmlformats.org/drawingml/2006/main",
  S = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const text = (x, max = 20000) => {
  if (
    typeof x !== "string" ||
    x.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x) ||
    decoder.decode(encoder.encode(x)) !== x
  )
    throw Error("文档文本无效或过长");
  return x;
};
const xml = (x) =>
  text(String(x)).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
function parse(source) {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw Error("拒绝 DTD/实体");
  return new DOMParser({
    onError: () => {
      throw Error("无效 XML");
    },
  }).parseFromString(source, "application/xml");
}
function serialize(doc) {
  return new XMLSerializer().serializeToString(doc);
}
function array(x, max) {
  if (!Array.isArray(x) || x.length > max) throw Error("文档结构超出限制");
  return x;
}
export function normalizeSpec(format, content) {
  if (!formats.includes(format)) throw Error("不支持的文档格式");
  text(content, 100000);
  if (!content.trim()) throw Error("内容为空");
  if (format === "md" || format === "html") return content;
  const s = JSON.parse(content);
  if (!s || typeof s !== "object" || Array.isArray(s))
    throw Error("Office 内容需要 JSON 对象");
  if (format === "docx") {
    text(s.title || "", 200);
    array(s.blocks, 200).forEach((b) => {
      if (!["paragraph", "heading", "table"].includes(b.type))
        throw Error("未知 Word 区块");
      if (b.type === "table")
        array(b.rows, 100).forEach((r) =>
          array(r, 20).forEach((c) => text(c, 2000)),
        );
      else text(b.text, 10000);
    });
  }
  if (format === "pptx" && !s.slides?.length) throw Error("至少一页幻灯片");
  if (format === "xlsx" && !s.sheets?.length) throw Error("至少一个工作表");
  if (format === "pptx")
    array(s.slides, 50).forEach((slide) => {
      text(slide.title, 200);
      array(slide.bullets || [], 12).forEach((t) => text(t, 1000));
      text(slide.notes || "", 2000);
    });
  if (format === "xlsx")
    array(s.sheets, 10).forEach((sheet) => {
      if (
        typeof sheet.name !== "string" ||
        !sheet.name ||
        sheet.name.length > 31 ||
        /[\\/?*\[\]:]/.test(sheet.name)
      )
        throw Error("工作表名称无效");
      array(sheet.rows, 1000).forEach((row) =>
        array(row, 50).forEach((cell) => {
          if (typeof cell === "string") text(cell, 2000);
          else if (typeof cell === "number") {
            if (!Number.isFinite(cell)) throw Error("无效数字");
          } else if (typeof cell !== "boolean" && cell !== null)
            throw Error("单元格只接受文本、数值、布尔或 null");
        }),
      );
    });
  if (
    format === "xlsx" &&
    new Set(s.sheets.map((s) => s.name.toLowerCase())).size !== s.sheets.length
  )
    throw Error("工作表名称重复");
  return s;
}
const col = (n) =>
  n < 26
    ? String.fromCharCode(65 + n)
    : col(Math.floor(n / 26) - 1) + col(n % 26);
function spreadsheet(spec) {
  const files = {
    "_rels/.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  };
  files["xl/workbook.xml"] =
    `<workbook xmlns="${S}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${spec.sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;
  files["xl/_rels/workbook.xml.rels"] =
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${spec.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`;
  files["[Content_Types].xml"] =
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${spec.sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  spec.sheets.forEach((s, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] =
      `<worksheet xmlns="${S}"><sheetData>${s.rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => cellXML(col(c) + (r + 1), value)).join("")}</row>`).join("")}</sheetData></worksheet>`;
  });
  return zip.zipSync(
    Object.fromEntries(
      Object.entries(files).map(([k, v]) => [k, encoder.encode(v)]),
    ),
  );
}
function cellXML(address, value) {
  if (value === null) return `<c r="${address}"/>`;
  if (typeof value === "number") return `<c r="${address}"><v>${value}</v></c>`;
  if (typeof value === "boolean")
    return `<c r="${address}" t="b"><v>${value ? 1 : 0}</v></c>`;
  return `<c r="${address}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}
export async function generateDocument(format, content) {
  const s = normalizeSpec(format, content);
  let bytes;
  if (format === "md" || format === "html") bytes = encoder.encode(s);
  if (format === "docx") {
    const children = [];
    if (s.title)
      children.push(
        new word.Paragraph({ text: s.title, heading: word.HeadingLevel.TITLE }),
      );
    for (const b of s.blocks) {
      if (b.type === "table")
        children.push(
          new word.Table({
            rows: b.rows.map(
              (row) =>
                new word.TableRow({
                  children: row.map(
                    (cell) =>
                      new word.TableCell({
                        children: [new word.Paragraph(cell)],
                      }),
                  ),
                }),
            ),
          }),
        );
      else
        children.push(
          new word.Paragraph({
            text: b.text,
            ...(b.type === "heading"
              ? { heading: word.HeadingLevel.HEADING_1 }
              : {}),
          }),
        );
    }
    bytes = await word.Packer.toBuffer(
      new word.Document({ creator: "WillBuddy", sections: [{ children }] }),
    );
  }
  if (format === "xlsx") bytes = spreadsheet(s);
  if (format === "pptx") {
    const deck = new PptxGenJS();
    deck.layout = "LAYOUT_WIDE";
    deck.author = "WillBuddy";
    deck.subject = "AI generated document";
    deck.lang = "zh-CN";
    for (const item of s.slides) {
      const slide = deck.addSlide();
      slide.background = { color: "FFFFFF" };
      slide.addText(item.title, {
        x: 0.65,
        y: 0.45,
        w: 12,
        h: 0.9,
        fontSize: 30,
        bold: true,
        color: "0078CB",
        fontFace: "Arial",
        breakLine: false,
      });
      if (item.bullets?.length)
        slide.addText(
          item.bullets.map((t) => ({
            text: t,
            options: { bullet: true, breakLine: true },
          })),
          {
            x: 0.85,
            y: 1.65,
            w: 11.5,
            h: 5,
            fontSize: 22,
            color: "25364A",
            paraSpaceAfterPt: 15,
            fit: "shrink",
          },
        );
      if (item.notes) slide.addNotes(item.notes);
    }
    bytes = await deck.write({ outputType: "nodebuffer" });
  }
  bytes = Buffer.from(bytes);
  const inspected = inspectDocument(format, bytes);
  return { bytes, ...inspected };
}
/** ZIP header bounds checked BEFORE inflation; entries never extracted to filesystem. */
export function openPackage(bytes) {
  if (bytes.length > 4 * 1024 * 1024) throw Error("Office 文件最多 4 MiB");
  const b = Buffer.from(bytes);
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--)
    if (b.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0 || b.readUInt16LE(end + 4) || b.readUInt16LE(end + 6))
    throw Error("无效或分卷 ZIP");
  const count = b.readUInt16LE(end + 10),
    size = b.readUInt32LE(end + 12),
    offset = b.readUInt32LE(end + 16);
  if (
    count > 2000 ||
    offset + size !== end ||
    end + 22 + b.readUInt16LE(end + 20) !== b.length
  )
    throw Error("ZIP 清单无效或过大");
  const names = new Set(),
    entries = new Map();
  let p = offset,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || b.readUInt32LE(p) !== 0x02014b50)
      throw Error("ZIP 条目无效");
    const n = b.readUInt16LE(p + 28),
      extra = b.readUInt16LE(p + 30),
      comment = b.readUInt16LE(p + 32),
      expanded = b.readUInt32LE(p + 24);
    if (p + 46 + n + extra + comment > end) throw Error("ZIP 条目截断");
    const name = decoder.decode(b.subarray(p + 46, p + 46 + n));
    if (
      !name ||
      names.has(name.toLowerCase()) ||
      name.startsWith("/") ||
      name.includes("\\") ||
      name.split("/").some((s) => s === "..") ||
      b.readUInt16LE(p + 8) & 1 ||
      expanded > 8 * 1024 * 1024
    )
      throw Error("拒绝 ZIP 路径、重复或加密条目");
    names.add(name.toLowerCase());
    total += expanded;
    if (total > 32 * 1024 * 1024) throw Error("ZIP 解压体积超限");
    entries.set(name, { size: expanded, crc: b.readUInt32LE(p + 16) });
    const local = b.readUInt32LE(p + 42);
    if (local + 30 > offset || b.readUInt32LE(local) !== 0x04034b50)
      throw Error("ZIP 本地条目无效");
    const localName = b.readUInt16LE(local + 26),
      localExtra = b.readUInt16LE(local + 28);
    if (
      local + 30 + localName + localExtra + b.readUInt32LE(p + 20) > offset ||
      decoder.decode(b.subarray(local + 30, local + 30 + localName)) !== name ||
      b.readUInt16LE(local + 8) !== b.readUInt16LE(p + 10) ||
      b.readUInt16LE(local + 6) !== b.readUInt16LE(p + 8)
    )
      throw Error("ZIP 本地/中央目录冲突");
    if (
      b.readUInt32LE(local + 22) !== expanded &&
      !(b.readUInt16LE(local + 6) & 8)
    )
      throw Error("ZIP 大小不一致");
    p += 46 + n + extra + comment;
  }
  if (
    p !== end ||
    names.has("vbaproject.bin") ||
    [...names].some(
      (n) => /vbaproject|embeddings\/|activex\//i.test(n) && !n.endsWith("/"),
    )
  )
    throw Error("拒绝宏、嵌入对象或异常 ZIP");
  const files = zip.unzipSync(b, {
    filter: (f) => {
      if (!names.has(f.name.toLowerCase()) || f.originalSize > 8 * 1024 * 1024)
        throw Error("ZIP 本地清单冲突");
      return true;
    },
  });
  if (Object.keys(files).length !== count) throw Error("ZIP 条目数不一致");
  let actual = 0;
  for (const [name, data] of Object.entries(files)) {
    const entry = entries.get(name);
    if (!entry || data.length !== entry.size || crc32(data) !== entry.crc)
      throw Error("ZIP CRC/大小校验失败");
    actual += data.length;
    if (actual > 32 * 1024 * 1024) throw Error("解压体积超限");
    if (name.endsWith(".xml") || name.endsWith(".rels")) {
      const source = decoder.decode(data);
      const document = parse(source);
      if (
        name === "[Content_Types].xml" &&
        /macroEnabled|vbaProject/i.test(source)
      )
        throw Error("拒绝宏文档");
      if (
        name.endsWith(".rels") &&
        Array.from(document.getElementsByTagNameNS("*", "Relationship")).some(
          (n) => n.getAttribute("TargetMode")?.toLowerCase() === "external",
        )
      )
        throw Error("拒绝外部关系链接，请先移除链接再导入");
    }
  }
  return files;
}
function parts(format, files) {
  return Object.keys(files)
    .filter((n) =>
      format === "docx"
        ? /^word\/(document|header\d+|footer\d+)\.xml$/.test(n)
        : format === "pptx"
          ? /^ppt\/slides\/slide\d+\.xml$/.test(n)
          : /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(n),
    )
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
export function inspectDocument(format, bytes) {
  if (!formats.includes(format)) throw Error("不支持的格式");
  if (bytes.length > 4 * 1024 * 1024) throw Error("文档最多 4 MiB");
  let extracted = "";
  if (format === "md" || format === "html")
    extracted = text(decoder.decode(bytes), 100000);
  else {
    const files = openPackage(bytes),
      required = {
        docx: "word/document.xml",
        xlsx: "xl/workbook.xml",
        pptx: "ppt/presentation.xml",
      }[format];
    if (!files[required] || !files["[Content_Types].xml"])
      throw Error("文件格式与扩展名不匹配");
    const sharedStrings =
      format === "xlsx" && files["xl/sharedStrings.xml"]
        ? Array.from(
            parse(
              decoder.decode(files["xl/sharedStrings.xml"]),
            ).getElementsByTagNameNS(S, "si"),
          ).map((n) => n.textContent)
        : [];
    for (const name of parts(format, files)) {
      const doc = parse(decoder.decode(files[name])),
        nodes = Array.from(
          doc.getElementsByTagNameNS(
            format === "docx" ? W : format === "pptx" ? A : S,
            format === "xlsx" ? "c" : "t",
          ),
        );
      extracted +=
        `\n[${name}]\n` +
        nodes
          .map((n) => {
            if (format !== "xlsx") return n.textContent;
            const value =
              n.getElementsByTagNameNS(S, "v")[0]?.textContent || "";
            const type = n.getAttribute("t"),
              formula = n.getElementsByTagNameNS(S, "f")[0]?.textContent;
            const display =
              type === "s"
                ? sharedStrings[Number(value)]
                : type === "inlineStr"
                  ? n.getElementsByTagNameNS(S, "is")[0]?.textContent || ""
                  : type === "b"
                    ? value === "1"
                      ? "true"
                      : "false"
                    : value;
            return `${n.getAttribute("r")}: ${formula ? "=" + formula + "（未重新计算；缓存值 " + display + "）" : display}`;
          })
          .join("\n");
    }
  }
  if (extracted.length > 100000) throw Error("文档文字超限");
  return { text: extracted, sha256: sha256(bytes), size: bytes.length };
}
export function editDocument(format, bytes, { replacements = [], cells = [] }) {
  array(replacements, 30);
  array(cells, 100);
  if (!replacements.length && !cells.length) throw Error("未提供修改");
  if (format !== "xlsx" && cells.length)
    throw Error("只有 Excel 支持单元格更新");
  for (const r of replacements) {
    text(r.find, 1000);
    text(r.replace, 2000);
    if (!r.find) throw Error("查找内容不能为空");
  }
  let output,
    changes = 0;
  if (format === "md" || format === "html") {
    let source = decoder.decode(bytes);
    for (const r of replacements) {
      const hits = source.split(r.find).length - 1;
      if (!hits) throw Error("查找文字不存在");
      changes += hits;
      source = source.split(r.find).join(r.replace);
    }
    text(source, 100000);
    output = encoder.encode(source);
  } else {
    const files = openPackage(bytes);
    if (format === "xlsx" && replacements.length)
      throw Error(
        "Excel 请使用 sheetIndex/address/value 更新，避免误改共享字符串",
      );
    const counts = replacements.map(() => 0);
    for (const name of parts(format, files)) {
      const doc = parse(decoder.decode(files[name]));
      let modified = false;
      // Apply replacements within each paragraph, including text split across runs, without flattening styles.
      const paragraphs = Array.from(
        doc.getElementsByTagNameNS(format === "docx" ? W : A, "p"),
      );
      for (const p of paragraphs) {
        const nodes = Array.from(
          p.getElementsByTagNameNS(format === "docx" ? W : A, "t"),
        );
        for (let k = 0; k < replacements.length; k++) {
          const { find, replace } = replacements[k];
          let combined = nodes.map((n) => n.textContent).join(""),
            positions = [];
          let start = 0,
            index;
          while ((index = combined.indexOf(find, start)) >= 0) {
            positions.push(index);
            start = index + find.length;
          }
          for (const at of positions.reverse()) {
            let offset = 0;
            for (const n of nodes) {
              const value = n.textContent,
                lo = Math.max(0, at - offset),
                hi = Math.min(value.length, at + find.length - offset);
              if (hi > lo) {
                n.textContent =
                  value.slice(0, lo) +
                  (at >= offset && at < offset + value.length ? replace : "") +
                  value.slice(hi);
                n.setAttribute("xml:space", "preserve");
              }
              offset += value.length;
            }
            counts[k]++;
            modified = true;
          }
        }
      }
      if (modified) files[name] = encoder.encode(serialize(doc));
    }
    if (counts.some((n) => !n)) throw Error("查找文字不存在（不跨段落）");
    changes += counts.reduce((a, b) => a + b, 0);
    for (const cell of cells) {
      if (
        !Number.isInteger(cell.sheetIndex) ||
        cell.sheetIndex < 1 ||
        cell.sheetIndex > 100 ||
        !/^([A-Z]{1,2})([1-9][0-9]{0,3})$/.test(cell.address)
      )
        throw Error("单元格地址无效");
      const name = `xl/worksheets/sheet${cell.sheetIndex}.xml`;
      if (!files[name]) throw Error("工作表不存在");
      let v = cell.value;
      if (typeof v === "string") text(v, 2000);
      else if (
        v !== null &&
        typeof v !== "boolean" &&
        !(typeof v === "number" && Number.isFinite(v))
      )
        throw Error("单元格值无效");
      const doc = parse(decoder.decode(files[name])),
        data = doc.getElementsByTagNameNS(S, "sheetData")[0];
      if (!data) throw Error("工作表无 sheetData");
      const r = Number(cell.address.match(/[0-9]+/)[0]);
      let row = Array.from(data.getElementsByTagNameNS(S, "row")).find(
        (n) => Number(n.getAttribute("r")) === r,
      );
      if (!row) {
        row = doc.createElementNS(S, "row");
        row.setAttribute("r", String(r));
        const next = Array.from(data.childNodes).find(
          (n) => Number(n.getAttribute?.("r")) > r,
        );
        data.insertBefore(row, next || null);
      }
      const existing = Array.from(row.getElementsByTagNameNS(S, "c")).find(
        (n) => n.getAttribute("r") === cell.address,
      );
      const newCell = doc.importNode(
        parse(`<root xmlns="${S}">${cellXML(cell.address, v)}</root>`)
          .documentElement.firstChild,
        true,
      );
      if (existing) {
        if (existing.hasAttribute("s"))
          newCell.setAttribute("s", existing.getAttribute("s"));
        row.replaceChild(newCell, existing);
      } else {
        const number = (a) => {
          let n = 0;
          for (const ch of a.match(/^[A-Z]+/)[0])
            n = n * 26 + ch.charCodeAt(0) - 64;
          return n;
        };
        const next = Array.from(row.getElementsByTagNameNS(S, "c")).find(
          (n) => number(n.getAttribute("r")) > number(cell.address),
        );
        row.insertBefore(newCell, next || null);
      }
      files[name] = encoder.encode(serialize(doc));
      changes++;
    }
    // Cached calculation results cannot safely be recalculated without a spreadsheet engine.
    if (format === "xlsx" && cells.length) {
      for (const [name, data] of Object.entries(files))
        if (
          /^xl\/worksheets\//.test(name) &&
          /<(?:\w+:)?f[\s>]/.test(decoder.decode(data))
        )
          throw Error("含公式工作簿暂不修改，避免保留过期计算值");
    }
    output = zip.zipSync(files);
  }
  const result = inspectDocument(format, output);
  return { bytes: Buffer.from(output), ...result, changes };
}
