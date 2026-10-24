import { randomUUID, createHash } from "node:crypto";
import { imageInfo, imageFromBase64 } from "../src/shared/image-bytes.js";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const imageViews = (data) =>
  (data.imageAttachments || []).map(
    ({ id, name, width, height, bytes, time }) => ({
      id,
      name,
      width,
      height,
      bytes,
      time,
    }),
  );
export function createImageService({ store, decode }) {
  let serial = Promise.resolve();
  const locked = (fn) => {
    const p = serial.then(fn);
    serial = p.catch(() => {});
    return p;
  };
  const rows = () => store.data.imageAttachments || [];
  const used = (id) =>
    store.data.chats.some((c) =>
      c.messages.some((m) => m.images?.some((i) => i.id === id)),
    );
  const read = (id) => {
    if (typeof id !== "string") throw Error("图片ID无效");
    const row = rows().find((r) => r.id === id);
    if (!row) throw Error("本机图片已移除或不存在");
    const bytes = imageFromBase64(row.base64);
    if (bytes.length !== row.bytes || digest(bytes) !== row.sha256)
      throw Error("本机图片完整性校验失败");
    return row;
  };
  return {
    async importFile(name, bytes) {
      imageInfo(bytes);
      if (typeof name !== "string" || !name.trim() || name.length > 160)
        throw Error("图片名称无效");
      // Decode/re-encode before persistence; model and renderer never provide filesystem paths.
      return locked(async () => {
        if (rows().length >= 30)
          throw Error("最多保留30张本机图片，请在图片库移除未使用项");
        const normalized = await decode(bytes),
          info = imageInfo(normalized, { pngOnly: true });
        if (
          rows().reduce((n, r) => n + r.bytes, 0) + normalized.length >
          16 * 1024 * 1024
        )
          throw Error("本机图片总量最多16 MiB，请清理未使用项");
        const row = {
          id: randomUUID(),
          name,
          width: info.width,
          height: info.height,
          mime: "image/png",
          bytes: normalized.length,
          base64: Buffer.from(normalized).toString("base64"),
          sha256: digest(normalized),
          time: Date.now(),
        };
        const before = store.data.imageAttachments;
        store.data.imageAttachments = [...rows(), row];
        try {
          await store.save();
        } catch (error) {
          store.data.imageAttachments = before;
          throw error;
        }
        return imageViews({ imageAttachments: [row] })[0];
      });
    },
    selected(ids) {
      if (
        !Array.isArray(ids) ||
        ids.length > 3 ||
        new Set(ids).size !== ids.length
      )
        throw Error("每次最多3张且不得重复附加图片");
      return ids.map((id) => structuredClone(read(id)));
    },
    preview(id) {
      const row = read(id);
      return { base64: row.base64, mime: row.mime };
    },
    remove(id) {
      return locked(async () => {
        read(id);
        if (used(id)) throw Error("图片仍被历史消息使用；请先删除关联对话");
        const before = store.data.imageAttachments;
        store.data.imageAttachments = rows().filter((r) => r.id !== id);
        try {
          await store.save();
        } catch (e) {
          store.data.imageAttachments = before;
          throw e;
        }
        return imageViews(store.data);
      });
    },
  };
}
