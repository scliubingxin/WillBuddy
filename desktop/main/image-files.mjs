import { imageInfo } from "../src/shared/image-bytes.js";
import { readDocumentSource } from "./document-files.mjs";
/** Native dialog only. The renderer cannot submit a path or raw image bytes. */
export function createImageImporter({
  dialog,
  getWindow,
  nativeImage,
  images,
}) {
  return async () => {
    const win = getWindow();
    if (!win || win.isDestroyed?.()) throw Error("图片选择窗口不可用");
    const result = await dialog.showOpenDialog(win, {
      title: "添加本机图片",
      properties: ["openFile"],
      filters: [
        { name: "PNG / JPEG 图片", extensions: ["png", "jpg", "jpeg"] },
      ],
    });
    if (result.canceled) return null;
    if (result.filePaths?.length !== 1) throw Error("每次选择一张图片");
    const path = result.filePaths[0],
      bytes = await readDocumentSource(path, { noFollow: true });
    imageInfo(bytes);
    if (win.isDestroyed?.()) throw Error("窗口已关闭");
    return images.importFile(path.split(/[\\/]/).at(-1), bytes);
  };
}
export function normalizeNativeImage(nativeImage, bytes) {
  imageInfo(bytes);
  const image = nativeImage.createFromBuffer(Buffer.from(bytes), {
    scaleFactor: 1,
  });
  if (image.isEmpty()) throw Error("无法解码该图片");
  const size = image.getSize(1);
  if (
    !size.width ||
    !size.height ||
    size.width > 4096 ||
    size.height > 4096 ||
    size.width * size.height > 4194304
  )
    throw Error("解码图片像素超限");
  const png = image.toPNG();
  imageInfo(png, { pngOnly: true });
  return png;
}
