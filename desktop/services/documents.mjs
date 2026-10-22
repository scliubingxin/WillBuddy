import { uid } from "../core.mjs";
import {
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
  history: (d.history || []).map(({ revision, time, sha256, size }) => ({
    revision,
    time,
    sha256,
    size,
  })),
});
export const documentViews = (data) => (data.documents || []).map(summary);
export function createDocumentService({ store, notify = () => {} }) {
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
        detail = `新建 ${name}.${args.format}\n${result.size} 字节\nSHA-256 ${result.sha256}\n内容结构/原文：\n${args.content}`;
      } else if (operation === "document_read") {
        const d = find(args.id);
        candidate = structuredClone(d);
        detail = `将文档 ${d.name}.${d.format} 第 ${d.revision} 版的提取文本发送给当前模型（不发送二进制附件）。\n${d.text.slice(0, 1000)}`;
      } else if (operation === "document_edit") {
        const prior = structuredClone(find(args.id));
        if (args.expectedRevision !== prior.revision)
          throw Error("文档版本不匹配，请先读取");
        const result = editDocument(
          prior.format,
          Buffer.from(prior.base64, "base64"),
          args,
        );
        candidate = record(prior.name, prior.format, result, prior);
        detail = `修改 ${prior.name}.${prior.format}\n第 ${prior.revision} → ${candidate.revision} 版；${result.changes} 处修改\n保留前版，原始导入文件不变。\n${JSON.stringify({ replacements: args.replacements, cells: args.cells }, null, 2)}\n新 SHA-256 ${result.sha256}`;
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
        return { status: "succeeded", document: summary(d) };
      }
      return save(candidate, signal);
    },
    async importFile(name, format, bytes, signal) {
      checkName(name);
      if (!formats.includes(format)) throw Error("格式不支持");
      const inspected = inspectDocument(format, bytes);
      return save(record(name, format, { bytes, ...inspected }), signal);
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
