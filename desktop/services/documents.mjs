import { wordStructure, patchWord } from "../runtime/word-structure.mjs";
import { uid } from "../core.mjs";
import {
  documentEditor,
  updateDocumentEditor,
  formats,
  generateDocument,
  inspectDocument,
  editDocument,
  sha256,
} from "../runtime/documents.mjs";
const summary = (d) => ({
  id: d.id,
  name: d.name,
  format: d.format,
  revision: d.revision,
  time: d.time,
  size: d.size,
  sha256: d.sha256,
  text: d.text,
  parentRevision: d.parentRevision,
  conversionSource: d.conversionSource,
  attachmentSource: d.attachmentSource,
  hasRichSource: typeof d.richSource === "string",
  history: (d.history || []).map(({ revision, time, sha256, size }) => ({
    revision,
    time,
    sha256,
    size,
  })),
});
export const documentViews = (data) => (data.documents || []).map(summary);
export function createDocumentService({
  store,
  notify = () => {},
  convertDocument,
}) {
  store.data.documents ??= [];
  let serial = Promise.resolve();
  const tokens = new WeakMap();
  const lock = (fn) => {
    const p = serial.then(fn);
    serial = p.catch(() => {});
    return p;
  };
  const find = (id) => {
    const d = store.data.documents.find((d) => d.id === id);
    if (!d) throw Error("文档不存在");
    return d;
  };
  async function save(candidate, signal) {
    signal?.throwIfAborted();
    return lock(async () => {
      signal?.throwIfAborted();
      if (
        candidate.conversionSource &&
        find(candidate.conversionSource.id).revision !==
          candidate.conversionSource.revision
      )
        throw Error("转换源文档版本已变化，请重试");
      const previous = store.data.documents;
      if (
        candidate.parentRevision !== undefined &&
        find(candidate.id).revision !== candidate.parentRevision
      )
        throw Error("文档版本已变化，请重新读取并审批");
      const next = [
        candidate,
        ...previous.filter((d) => d.id !== candidate.id),
      ];
      if (
        next.length > 100 ||
        Buffer.byteLength(JSON.stringify(next)) > 16 * 1024 * 1024
      )
        throw Error("文档空间超限（100 个 / 16 MiB），请导出备份后清理");
      store.data.documents = next;
      try {
        await store.save();
      } catch (e) {
        store.data.documents = previous;
        throw e;
      }
      notify();
      return {
        status: "succeeded",
        document: summary(candidate),
        verified: true,
      };
    });
  }
  function record(name, format, result, prior) {
    return {
      id: prior?.id || uid(),
      name,
      format,
      revision: (prior?.revision || 0) + 1,
      time: Date.now(),
      size: result.size,
      sha256: result.sha256,
      text: result.text,
      base64: Buffer.from(result.bytes).toString("base64"),
      ...(prior
        ? {
            parentRevision: prior.revision,
            history: [
              ...(prior.history || []),
              {
                revision: prior.revision,
                time: prior.time,
                sha256: prior.sha256,
                size: prior.size,
                base64: prior.base64,
              },
            ].slice(-5),
          }
        : {}),
    };
  }
  function checkName(name) {
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 100 ||
      /[\u0000-\u001f/\\]/.test(name)
    )
      throw Error("文档名称无效");
    return name.trim();
  }
  return {
    list: () => documentViews(store.data),
    async prepare(operation, args, signal) {
      signal?.throwIfAborted();
      let candidate, detail;
      if (operation === "document_create") {
        const name = checkName(args.name),
          result = await generateDocument(args.format, args.content);
        signal?.throwIfAborted();
        candidate = record(name, args.format, result);
        detail = `新建 ${name}.${args.format}\n${result.size} 字节\nSHA-256 ${result.sha256}\n内容摘要（前400字符，完整内容保存后可预览）：\n${result.text.replace(/\s+/g, " ").slice(0, 400)}`;
      } else if (operation === "document_convert") {
        if (!convertDocument) throw Error("本环境尚未配置离线转换引擎");
        const prior = structuredClone(find(args.id));
        if (prior.revision !== args.expectedRevision)
          throw Error("转换源版本不匹配");
        const result = await convertDocument(
          prior.format,
          Buffer.from(prior.base64, "base64").toString("utf8"),
          signal,
        );
        candidate = record(checkName(prior.name + "-Word"), "docx", result);
        candidate.richSource = result.sourceHtml;
        candidate.conversionSource = {
          id: prior.id,
          revision: prior.revision,
          sha256: prior.sha256,
        };
        detail = `将 ${prior.name}.${prior.format} 第 ${prior.revision} 版转换为新的Word文档。\n本机GenOffice引擎，不联网；原文和旧版本不变。\n${result.size} 字节\nSHA-256 ${result.sha256}`;
      } else if (operation === "document_write") {
        if (!convertDocument) throw Error("本环境尚未配置离线转换引擎");
        const prior = args.id ? structuredClone(find(args.id)) : undefined;
        if (
          prior &&
          (prior.format !== "docx" ||
            !prior.richSource ||
            prior.revision !== args.expectedRevision)
        )
          throw Error("仅本机画布文档支持此编辑，或版本已经变化");
        const result = await convertDocument("html", args.html, signal);
        candidate = record(
          checkName(prior?.name || args.name),
          "docx",
          result,
          prior,
        );
        candidate.richSource = result.sourceHtml;
        detail = `保存Word画布：${candidate.name}.docx\n${prior ? "第 " + prior.revision + " → " + candidate.revision + " 版" : "新建文档"}，${result.size}字节\n本机GenOffice引擎；保留前版，原件不变。\n内容摘要：${result.text.replace(/\s+/g, " ").slice(0, 350)}\nSHA-256 ${result.sha256}`;
      } else if (operation === "document_read") {
        const d = find(args.id);
        candidate = structuredClone(d);
        detail = `将文档 ${d.name}.${d.format} 第 ${d.revision} 版的提取文本、可编辑片段坐标${d.richSource ? "与画布HTML源" : ""}发送给当前模型（不发送二进制附件）。\n${d.text.replace(/\s+/g, " ").slice(0, 400)}`;
      } else if (operation === "document_patch") {
        const prior = structuredClone(find(args.id));
        if (prior.format !== "docx" || prior.richSource)
          throw Error("仅导入/结构化Word支持片段编辑，画布请用document_write");
        if (prior.revision !== args.expectedRevision)
          throw Error("文档版本不匹配，请先读取");
        if (JSON.stringify(args.patches).length > 600)
          throw Error("本次修改太长，请拆成较小批次审阅");
        const result = patchWord(
          Buffer.from(prior.base64, "base64"),
          args.patches,
        );
        candidate = record(prior.name, "docx", result, prior);
        detail = `修改Word内容/结构：${prior.name}.docx\n第 ${prior.revision} → ${candidate.revision} 版；${result.changes}处修改。保留前版与原件。\n${JSON.stringify(args.patches)}\n新 SHA-256 ${result.sha256}`;
      } else if (operation === "document_edit") {
        const prior = structuredClone(find(args.id));
        if (prior.richSource)
          throw Error(
            "画布文档请使用Word画布或document_write编辑，以保留富文本源",
          );
        if (args.expectedRevision !== prior.revision)
          throw Error("文档版本不匹配，请先读取");
        if (
          JSON.stringify({ replacements: args.replacements, cells: args.cells })
            .length > 600
        )
          throw Error("本次修改太长，请拆成较小批次审阅");
        const result = editDocument(
          prior.format,
          Buffer.from(prior.base64, "base64"),
          args,
        );
        candidate = record(prior.name, prior.format, result, prior);
        detail = `修改 ${prior.name}.${prior.format}\n第 ${prior.revision} → ${candidate.revision} 版；${result.changes} 处修改\n保留前版，原始导入文件不变。\n${JSON.stringify({ replacements: args.replacements, cells: args.cells })}\n新 SHA-256 ${result.sha256}`;
      } else throw Error("未知文档操作");
      // Token owns immutable, host-generated candidate. Never trust a renderer-supplied receipt.
      const token = Object.freeze({ operation, detail });
      tokens.set(token, candidate);
      return token;
    },
    async perform(token, signal) {
      const candidate = tokens.get(token);
      if (!candidate) throw Error("审批凭证无效或已使用");
      tokens.delete(token);
      signal?.throwIfAborted();
      if (token.operation === "document_read") {
        const d = find(candidate.id);
        if (d.revision !== candidate.revision)
          throw Error("审批期间文档版本变化");
        return {
          status: "succeeded",
          document: {
            ...summary(d),
            ...(d.format === "xlsx"
              ? (() => {
                  try {
                    const editor = documentEditor(
                      "xlsx",
                      Buffer.from(d.base64, "base64"),
                    );
                    return JSON.stringify(editor).length <= 12000
                      ? { spreadsheetEditing: editor }
                      : {
                          spreadsheetEditingUnavailable:
                            "表格结构超过模型读取上限，请在本机表格编辑器处理，不要猜测公式/表名",
                        };
                  } catch (e) {
                    return { spreadsheetEditingUnavailable: e.message };
                  }
                })()
              : {}),
            ...(d.format === "docx" && !d.richSource
              ? (() => {
                  try {
                    const structure = wordStructure(
                      Buffer.from(d.base64, "base64"),
                    );
                    return JSON.stringify(structure).length <= 12000
                      ? { wordEditing: structure }
                      : {
                          wordEditingUnavailable:
                            "片段信息超过模型读取上限，请在本机Word分段编辑器操作；不要猜测坐标",
                        };
                  } catch (e) {
                    return { wordEditingUnavailable: e.message };
                  }
                })()
              : {}),
            ...(d.richSource
              ? {
                  text: d.text.slice(0, 5000),
                  ...(d.richSource.length <= 12000
                    ? { editableHtml: d.richSource }
                    : {
                        editableHtmlUnavailable:
                          "HTML源较长，请在Word画布编辑；不要根据不完整源覆盖其他结构",
                      }),
                }
              : {}),
          },
        };
      }
      return save(candidate, signal);
    },
    async importBatch(items) {
      if(!Array.isArray(items)||!items.length||items.length>32)throw Error('附件批次无效');
      const candidates=items.map(i=>({...record(checkName(i.name),i.format,{bytes:i.bytes,...inspectDocument(i.format,i.bytes)}),...(i.archive?{attachmentSource:{archive:i.archive,entryPath:i.entryPath}}:{})}));
      return lock(async()=>{
        const previous=store.data.documents,next=[...candidates,...previous];
        if(next.length>100||Buffer.byteLength(JSON.stringify(next))>16*1024*1024)throw Error('文档空间超限（100个/16MiB）');
        store.data.documents=next;
        try{await store.save();}catch(e){store.data.documents=previous;throw e;}
        notify();return candidates.map(summary);
      });
    },
    async importFile(name, format, bytes, signal) {
      checkName(name);
      if (!formats.includes(format)) throw Error("格式不支持");
      const inspected = inspectDocument(format, bytes);
      return save(record(name, format, { bytes, ...inspected }), signal);
    },
    richEditor(id) {
      const d = find(id);
      if (!d.richSource)
        throw Error("该文件没有画布源，请使用Word分段编辑或内容编辑");
      return { id, name: d.name, revision: d.revision, html: d.richSource };
    },
    editor(id, mode) {
      const d = find(id);
      return {
        id,
        revision: d.revision,
        name: d.name,
        format: d.format,
        ...(mode === "runs" && d.format === "docx" && !d.richSource
          ? wordStructure(Buffer.from(d.base64, "base64"))
          : documentEditor(d.format, Buffer.from(d.base64, "base64"))),
      };
    },
    async updateEditor(id, revision, patch, approve, signal) {
      const prior = structuredClone(find(id));
      if (prior.richSource) throw Error("画布文档请使用Word画布编辑");
      if (prior.revision !== revision)
        throw Error("文档版本已变化，请重新打开编辑器");
      const result =
        patch.patches && prior.format === "docx"
          ? patchWord(Buffer.from(prior.base64, "base64"), patch.patches)
          : updateDocumentEditor(
              prior.format,
              Buffer.from(prior.base64, "base64"),
              patch,
            );
      signal?.throwIfAborted();
      if (
        !(await approve(
          "保存文档编辑",
          `${prior.name}.${prior.format}\n第 ${revision} → ${revision + 1} 版，${result.changes} 处修改。\n修改已在编辑器中显示；保留前版，原文件不变。\n新 SHA-256 ${result.sha256}`,
          signal,
        ))
      )
        return { status: "denied" };
      signal?.throwIfAborted();
      return save(record(prior.name, prior.format, result, prior), signal);
    },
    async replaceBytes(id, revision, bytes, signal) {
      const prior = structuredClone(find(id));
      if (prior.richSource) throw Error("画布文档请使用Word画布编辑");
      if (prior.revision !== revision)
        throw Error("文档版本已变化，不能覆盖新版本");
      return save(
        record(
          prior.name,
          prior.format,
          { bytes, ...inspectDocument(prior.format, bytes) },
          prior,
        ),
        signal,
      );
    },
    preview(id,revision) {
      const current=find(id);
      if(current.revision!==revision)throw Error("文档版本已变化，请重新预览");
      if(!["docx","xlsx","pptx"].includes(current.format))throw Error("请使用文本预览");
      const bytes=Buffer.from(current.base64,"base64");
      if(sha256(bytes)!==current.sha256)throw Error("文档校验失败");
      inspectDocument(current.format,bytes);
      return {format:current.format,base64:current.base64,revision,sha256:current.sha256};
    },
    read(id) {
      return summary(find(id));
    },
    bytes(id, revision) {
      const current = find(id),
        d =
          revision === current.revision
            ? current
            : current.history?.find((h) => h.revision === revision);
      if (!d) throw Error("导出版本不存在，请重新选择");
      const bytes = Buffer.from(d.base64, "base64");
      if (sha256(bytes) !== d.sha256) throw Error("文档校验失败");
      return {
        bytes,
        name:
          current.name + (revision === current.revision ? "" : "-v" + revision),
        format: current.format,
        sha256: d.sha256,
      };
    },
    remove(id) {
      return lock(async () => {
        const prev = store.data.documents;
        store.data.documents = prev.filter((d) => d.id !== id);
        try {
          await store.save();
        } catch (e) {
          store.data.documents = prev;
          throw e;
        }
        notify();
        return true;
      });
    },
  };
}
