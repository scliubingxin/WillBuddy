/** SpreadsheetML adapter for the bounded local formula engine. Mutates only supplied ZIP entries. */
import office from "./vendor/office.cjs";
import path from "node:path";
import {
  calculateWorkbook,
  parseFormula,
  cellAddress,
} from "../src/shared/formula-core.js";
const S = "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
  R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const encode = (s) => new TextEncoder().encode(s),
  decode = (b) => new TextDecoder("utf-8", { fatal: true }).decode(b);
const nodes = (n, name) => Array.from(n.getElementsByTagNameNS(S, name));
const direct = (n, name) =>
  Array.from(n.childNodes).filter(
    (x) => x.namespaceURI === S && x.localName === name,
  );
const parse = (b) =>
  new office.DOMParser({
    onError: () => {
      throw Error("工作簿XML无效");
    },
  }).parseFromString(decode(b), "application/xml");
const serialize = (n) =>
  encode(new office.XMLSerializer().serializeToString(n));
export function formulaValue(value) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    typeof value.formula === "string"
  );
}
export function validateFormula(value) {
  if (!formulaValue(value))
    throw Error('公式须为显式 {formula:"SUM(A1:A3)"} 对象');
  parseFormula(value.formula);
  return value.formula.trim().replace(/^=/, "");
}
export function workbookModel(files) {
  if (
    Object.keys(files).some((n) =>
      n.toLowerCase().startsWith("_xmlsignatures/"),
    )
  )
    throw Error("带数字签名的工作簿不可修改");
  if (
    Object.keys(files).some((n) =>
      /^xl\/(charts|pivotTables|pivotCache|tables)\//.test(n),
    )
  )
    throw Error("图表/透视表/结构化表暂不支持本机重算修改");
  const book = parse(files["xl/workbook.xml"]),
    rels = files["xl/_rels/workbook.xml.rels"];
  if (!rels) throw Error("工作簿缺少关系清单");
  const relDoc = parse(rels),
    relationships = Array.from(
      relDoc.getElementsByTagNameNS("*", "Relationship"),
    ),
    ids = new Map(),
    used = new Set();
  for (const r of relationships) {
    if (ids.has(r.getAttribute("Id"))) throw Error("工作簿关系ID重复");
    ids.set(r.getAttribute("Id"), r);
  }
  const shared = files["xl/sharedStrings.xml"]
    ? nodes(parse(files["xl/sharedStrings.xml"]), "si").map((n) =>
        nodes(n, "t")
          .map((t) => t.textContent)
          .join(""),
      )
    : [];
  const sheets = nodes(book, "sheet").map((n, i) => {
    const r = ids.get(n.getAttributeNS(R, "id"));
    if (
      !r ||
      !r.getAttribute("Type").endsWith("/worksheet") ||
      (r.getAttribute("TargetMode") || "").toLowerCase() === "external"
    )
      throw Error("不支持非普通工作表或外部目标");
    const target = r.getAttribute("Target"),
      part = target.startsWith("/")
        ? target.slice(1)
        : path.posix.normalize("xl/" + target);
    if (
      !/^xl\/worksheets\/[^/]+\.xml$/.test(part) ||
      !files[part] ||
      used.has(part)
    )
      throw Error("工作表关系目标无效或重复");
    used.add(part);
    const sheetIndex = Number(
      part.match(/^xl\/worksheets\/sheet(\d+)\.xml$/)?.[1],
    );
    if (!sheetIndex || sheetIndex > 100)
      throw Error("当前仅支持sheetN.xml工作表");
    const doc = parse(files[part]),
      data = nodes(doc, "sheetData");
    if (data.length !== 1) throw Error("工作表数据区无效");
    const cells = new Map();
    const rowIds = new Set();
    for (const row of direct(data[0], "row")) {
      if (rowIds.has(row.getAttribute("r"))) throw Error("工作表行号重复");
      rowIds.add(row.getAttribute("r"));
      for (const c of direct(row, "c")) {
        if (
          Array.from(c.attributes).some(
            (a) => !["r", "s", "t"].includes(a.name),
          )
        )
          throw Error("不支持带扩展元数据的单元格");
        const address = cellAddress(c.getAttribute("r")).address;
        if (c.getAttribute("r") !== address)
          throw Error("单元格地址必须为规范大写A1形式");
        if (cells.has(address)) throw Error("工作表单元格地址重复");
        if (
          Number(c.getAttribute("r").match(/\d+/)[0]) !==
          Number(row.getAttribute("r"))
        )
          throw Error("单元格行号冲突");
        const f = direct(c, "f"),
          v = direct(c, "v"),
          type = c.getAttribute("t");
        let value = null;
        if (f.length > 1 || v.length > 1) throw Error("单元格重复公式/缓存");
        if (f.length) {
          if (["inlineStr", "s"].includes(type))
            throw Error("公式与字符串类型冲突");
          if (f[0].attributes.length) throw Error("共享/数组/动态公式暂不支持");
          parseFormula(f[0].textContent);
        }
        if (type === "s") {
          const k = Number(v[0]?.textContent);
          if (!v.length || !Number.isInteger(k) || k < 0 || k >= shared.length)
            throw Error("共享字符串索引无效");
          value = shared[k];
        } else if (type === "inlineStr")
          value = nodes(c, "t")
            .map((n) => n.textContent)
            .join("");
        else if (type === "str") value = v[0]?.textContent || "";
        else if (type === "b") {
          if (!["0", "1"].includes(v[0]?.textContent))
            throw Error("布尔单元格值无效");
          value = v[0].textContent === "1";
        } else if (type === "e") {
          const error = v[0]?.textContent;
          if (
            ![
              "#DIV/0!",
              "#VALUE!",
              "#NUM!",
              "#N/A",
              "#NAME?",
              "#REF!",
              "#NULL!",
            ].includes(error)
          )
            throw Error("未知计算错误值");
          value = { error };
        } else if (!type || type === "n") {
          if (v.length && v[0].textContent !== "") {
            value = Number(v[0].textContent);
            if (!Number.isFinite(value)) throw Error("数值单元格无效");
          }
        } else throw Error("不支持的单元格类型 " + type);
        cells.set(address, {
          node: c,
          value,
          ...(f.length ? { formula: f[0].textContent } : {}),
        });
      }
    }
    if (
      nodes(doc, "c").length !== cells.size ||
      nodes(doc, "f").length !==
        [...cells.values()].filter((c) => c.formula !== undefined).length
    )
      throw Error("工作表含非标准嵌套单元格或公式");
    if (cells.size > 5000) throw Error("计算最多5000个现有单元格");
    return {
      name: n.getAttribute("name"),
      sheetIndex,
      part,
      doc,
      cells,
      order: i,
    };
  });
  if (!sheets.length) throw Error("工作簿没有工作表");
  return { book, relDoc, sheets };
}
export function recalculateWorkbook(files, { force = false } = {}) {
  // Constant-only packages retain the existing no-formula path and its larger bounds.
  const hasFormula = Object.entries(files).some(
    ([n, b]) =>
      /^xl\/worksheets\//.test(n) && /<(?:\w+:)?f[\s>]/.test(decode(b)),
  );
  if (!hasFormula && !force) return { formulas: 0 };
  const { book, relDoc, sheets } = workbookModel(files),
    result = calculateWorkbook(sheets);
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    let changed = false;
    for (const [address, c] of sheet.cells) {
      if (c.formula === undefined) continue;
      const value = result.values.get(i + "!" + address),
        node = c.node;
      for (const v of direct(node, "v")) node.removeChild(v);
      node.removeAttribute("t");
      const v = sheet.doc.createElementNS(S, "v");
      if (value && typeof value === "object") {
        node.setAttribute("t", "e");
        v.textContent = value.error;
      } else if (typeof value === "boolean") {
        node.setAttribute("t", "b");
        v.textContent = value ? "1" : "0";
      } else if (typeof value === "string") {
        node.setAttribute("t", "str");
        v.textContent = value;
      } else v.textContent = String(value ?? 0);
      node.appendChild(v);
      changed = true;
    }
    if (changed) files[sheet.part] = serialize(sheet.doc);
  }
  // Our engine does not maintain Excel's dependency-chain order; remove its package references.
  for (const rel of Array.from(
    relDoc.getElementsByTagNameNS("*", "Relationship"),
  ))
    if (rel.getAttribute("Type").endsWith("/calcChain")) {
      const t = rel.getAttribute("Target"),
        part = t.startsWith("/") ? t.slice(1) : path.posix.normalize("xl/" + t);
      delete files[part];
      rel.parentNode.removeChild(rel);
      if (files["[Content_Types].xml"]) {
        const types = parse(files["[Content_Types].xml"]);
        for (const n of Array.from(
          types.getElementsByTagNameNS("*", "Override"),
        ))
          if (n.getAttribute("PartName") === "/" + part)
            n.parentNode.removeChild(n);
        files["[Content_Types].xml"] = serialize(types);
      }
    }
  files["xl/_rels/workbook.xml.rels"] = serialize(relDoc);
  let calc = nodes(book, "calcPr")[0];
  if (!calc) {
    calc = book.createElementNS(S, "calcPr");
    book.documentElement.appendChild(calc);
  }
  calc.setAttribute("calcMode", "auto");
  calc.setAttribute("fullCalcOnLoad", "1");
  calc.setAttribute("forceFullCalc", "1");
  files["xl/workbook.xml"] = serialize(book);
  return { formulas: result.formulaCount, visited: result.visited };
}
export function spreadsheetEditor(files) {
  const { sheets } = workbookModel(files);
  const hasFormula = sheets.some((s) =>
    [...s.cells.values()].some((c) => c.formula !== undefined),
  );
  const result = hasFormula ? calculateWorkbook(sheets) : null,
    cells = [];
  for (let i = 0; i < sheets.length; i++)
    for (const [address, c] of sheets[i].cells)
      cells.push({
        sheetIndex: sheets[i].sheetIndex,
        address,
        value: c.value,
        ...(c.formula !== undefined
          ? {
              formula: c.formula,
              calculated: result.values.get(i + "!" + address),
            }
          : {}),
      });
  if (cells.length > 500) throw Error("内置表格编辑最多500个现有单元格");
  return {
    kind: "cells",
    sheets: sheets.map(({ name, sheetIndex }) => ({ name, sheetIndex })),
    cells,
    calculation: hasFormula
      ? "WillBuddy bounded formula subset; editor computes current values without saving"
      : "constants",
  };
}

export function validateSpreadsheet(files) {
  const { sheets } = workbookModel(files);
  return calculateWorkbook(sheets);
}
