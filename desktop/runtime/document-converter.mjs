/** Real GenOffice conversion pipeline; the host supplies a sandboxed, offline browser. */
import { readFile } from "node:fs/promises";
import { Marked } from "../src/vendor/marked.js";
import engine from "./vendor/genoffice.cjs";
import { inspectDocument } from "./documents.mjs";
const markdown = new Marked({ gfm: true, breaks: true });
const sanitizer = await readFile(
  new URL("./vendor/conversion-sanitizer.js", import.meta.url),
  "utf8",
);
export function createDocumentConverter({ createDriver, timeoutMs = 15000 }) {
  let active = 0;
  return async function convert(format, content, signal) {
    if (!["md", "html"].includes(format))
      throw Error("目前仅支持Markdown/HTML转换为Word");
    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 100000
    )
      throw Error("转换原文为空或超过100000字符");
    signal?.throwIfAborted();
    if (active >= 2) throw Error("已有两个文档正在转换，请稍后再试");
    active++;
    const deadline = AbortSignal.timeout(timeoutMs),
      combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
    let driver;
    const cancel = () => {
      driver?.close().catch(() => {});
    };
    combined.addEventListener("abort", cancel, { once: true });
    try {
      const pending = Promise.resolve(createDriver(combined));
      pending.then(
        (d) => {
          if (combined.aborted) d.close().catch(() => {});
        },
        () => {},
      );
      driver = await engine.raceWithAbort(pending, combined);
      combined.throwIfAborted();
      await driver.addScript(sanitizer);
      const source = format === "md" ? markdown.parse(content) : content;
      if (source.length > 200000) throw Error("展开后的Markdown过长");
      const clean = await driver.evaluate(
        (source) => globalThis.willbuddyConversionHTML(source),
        source,
      );
      combined.throwIfAborted();
      const url = "data:text/html;charset=utf-8," + encodeURIComponent(clean);
      const result = await engine.convertHtmlToDocx({ url }, driver, {
        signal: combined,
      });
      combined.throwIfAborted();
      if (result.stats.rasterizedDocumentText)
        throw Error("此布局需整页图片化，无法保证文字可编辑，请简化后重试");
      const bytes = Buffer.from(result.docx),
        checked = inspectDocument("docx", bytes);
      if (!checked.text.trim()) throw Error("转换结果没有可编辑文字");
      return {
        bytes,
        ...checked,
        sourceHtml: clean,
        conversion: {
          engine: "GenOffice html2docx",
          commit: "342abce4280ea92bf7e59580f1ecaf9b562d0f72",
          sourceFormat: format,
          screenshots: result.stats.screenshots,
        },
      };
    } finally {
      combined.removeEventListener("abort", cancel);
      try {
        await driver?.close();
      } finally {
        active--;
      }
    }
  };
}
