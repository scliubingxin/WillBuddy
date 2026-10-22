import { escape } from "./markdown.js";
import { calculateWorkbook, cellAddress } from "../shared/formula-core.js";
const display = (v) => v?.error || String(v ?? "");
const kind = (c) =>
  c.value?.error && c.formula === undefined
    ? "error"
    : c.formula !== undefined
      ? "formula"
      : c.value === null
        ? "blank"
        : typeof c.value === "number"
          ? "number"
          : typeof c.value === "boolean"
            ? "boolean"
            : "text";
/** Uses the SAME pure formula core for preview; main recomputes all caches before approval/save. */
export function mountSpreadsheet(root, editor) {
  const rows = editor.cells.map((c) => ({
    ...c,
    original: { ...c },
    type: kind(c),
    input: c.formula !== undefined ? c.formula : display(c.value),
  }));
  let serial = rows.length,
    activeSheet = editor.sheets[0].sheetIndex,
    formulasOnly = false;
  function value(r) {
    if (r.type === "formula") return { formula: r.input };
    if (r.type === "blank") return null;
    if (r.type === "error") return r.original.value;
    if (r.type === "number") {
      if (!r.input.trim() || !Number.isFinite(Number(r.input)))
        throw Error("数值无效：" + r.address);
      return Number(r.input);
    }
    if (r.type === "boolean") {
      if (!["true", "false"].includes(r.input))
        throw Error("布尔值只接受true/false");
      return r.input === "true";
    }
    return r.input;
  }
  function preview() {
    try {
      const sheets = editor.sheets.map((s) => ({
        name: s.name,
        cells: new Map(
          rows
            .filter((r) => r.sheetIndex === s.sheetIndex)
            .map((r) => {
              const v = value(r);
              return [r.address, v?.formula !== undefined ? v : { value: v }];
            }),
        ),
      }));
      const result = calculateWorkbook(sheets);
      rows.forEach((r, i) => {
        const out = root.querySelector('[data-result="' + i + '"]');
        if (out)
          out.textContent =
            r.type === "formula"
              ? display(
                  result.values.get(
                    editor.sheets.findIndex(
                      (s) => s.sheetIndex === r.sheetIndex,
                    ) +
                      "!" +
                      r.address,
                  ),
                )
              : "—";
      });
      root.querySelector('[role="status"]').textContent =
        "本机预览已重算 " + result.formulaCount + " 条公式；保存后写入文件。";
    } catch (e) {
      root.querySelector('[role="status"]').textContent = e.message;
      root
        .querySelectorAll("[data-result]")
        .forEach((n) => (n.textContent = "待修正"));
    }
  }
  function draw() {
    root.innerHTML = `<p>支持算术、同/跨表A1引用、SUM / AVERAGE / MIN / MAX / COUNT / IF / ROUND。类型必须显式选择“公式”，文本以 = 开头也不会执行。不是完整Excel引擎；不支持的公式或循环会阻止保存。</p><div class="sheet-add"><select aria-label="新增单元格工作表">${editor.sheets.map((s) => `<option value="${s.sheetIndex}" ${s.sheetIndex === activeSheet ? "selected" : ""}>${escape(s.name)}</option>`).join("")}</select><input aria-label="新增单元格地址" placeholder="例如 D5"><button type="button" data-sheet-add>添加空白单元格</button></div><div class="sheet-tabs">${editor.sheets.map((s) => `<button type="button" data-sheet-tab="${s.sheetIndex}" aria-pressed="${s.sheetIndex === activeSheet}">${escape(s.name)}</button>`).join("")}<label><input type="checkbox" data-formulas-only ${formulasOnly ? "checked" : ""}>只看公式</label></div><p role="status" aria-live="polite"></p>${editor.sheets
      .filter((s) => s.sheetIndex === activeSheet)
      .map(
        (s) =>
          `<h3>${escape(s.name)}</h3><div class="sheet-scroll"><table class="sheet-cells"><thead><tr><th>地址</th><th>类型</th><th>内容 / 公式</th><th>计算结果</th></tr></thead><tbody>${rows
            .map((r, i) =>
              r.sheetIndex !== s.sheetIndex ||
              (formulasOnly && r.type !== "formula")
                ? ""
                : `<tr><th>${escape(r.address)}</th><td><select data-cell-type="${i}" aria-label="${escape(s.name + "!" + r.address)} 类型">${[
                    ["text", "文本"],
                    ...(r.type === "error" ? [["error", "错误（只读）"]] : []),
                    ["number", "数值"],
                    ["boolean", "布尔"],
                    ["blank", "空白"],
                    ["formula", "公式"],
                  ]
                    .map(
                      ([v, label]) =>
                        `<option value="${v}" ${r.type === v ? "selected" : ""}>${label}</option>`,
                    )
                    .join(
                      "",
                    )}</select></td><td><input data-cell-input="${i}" aria-label="${escape(s.name + "!" + r.address)}" value="${escape(r.input)}" ${["blank", "error"].includes(r.type) ? "disabled" : ""}></td><td data-result="${i}"></td></tr>`,
            )
            .join("")}</tbody></table></div>`,
      )
      .join("")}`;
    root.querySelectorAll("[data-sheet-tab]").forEach(
      (n) =>
        (n.onclick = () => {
          activeSheet = Number(n.dataset.sheetTab);
          draw();
        }),
    );
    root.querySelector("[data-formulas-only]").onchange = (e) => {
      formulasOnly = e.target.checked;
      draw();
    };
    root.querySelectorAll("[data-cell-input]").forEach((n) =>
      n.addEventListener("input", () => {
        rows[Number(n.dataset.cellInput)].input = n.value;
        preview();
      }),
    );
    root.querySelectorAll("[data-cell-type]").forEach((n) =>
      n.addEventListener("change", () => {
        const i = Number(n.dataset.cellType),
          r = rows[i];
        r.type = n.value;
        const input = root.querySelector('[data-cell-input="' + i + '"]');
        input.disabled = ["blank", "error"].includes(r.type);
        if (r.type === "boolean" && !["true", "false"].includes(r.input)) {
          r.input = "false";
          input.value = r.input;
        }
        preview();
      }),
    );
    root.querySelector("[data-sheet-add]").onclick = () => {
      try {
        if (rows.length >= 500) throw Error("最多编辑500格");
        const sheetIndex = Number(
            root.querySelector('[aria-label="新增单元格工作表"]').value,
          ),
          address = cellAddress(
            root.querySelector('[aria-label="新增单元格地址"]').value.trim(),
          ).address;
        if (
          rows.some((r) => r.sheetIndex === sheetIndex && r.address === address)
        )
          throw Error("单元格已经存在");
        rows.push({
          sheetIndex,
          address,
          type: "text",
          input: "",
          created: serial++,
        });
        activeSheet = sheetIndex;
        formulasOnly = false;
        draw();
      } catch (e) {
        root.querySelector('[role="status"]').textContent = e.message;
      }
    };
    preview();
  }
  draw();
  return {
    patch() {
      const sheets = editor.sheets.map((s) => ({
        name: s.name,
        cells: new Map(
          rows
            .filter((r) => r.sheetIndex === s.sheetIndex)
            .map((r) => {
              const v = value(r);
              return [r.address, v?.formula !== undefined ? v : { value: v }];
            }),
        ),
      }));
      calculateWorkbook(sheets);
      return {
        cells: rows.flatMap((r) => {
          const v = value(r),
            prior = r.original
              ? r.original.formula !== undefined
                ? { formula: r.original.formula }
                : r.original.value
              : undefined;
          return JSON.stringify(v) === JSON.stringify(prior)
            ? []
            : [{ sheetIndex: r.sheetIndex, address: r.address, value: v }];
        }),
      };
    },
  };
}
