import { rasterInfo } from "../preview/spreadsheet-images.js";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export function imageInfo(bytes, { pngOnly = false } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_IMAGE_BYTES)
    throw Error("图片最多2 MiB");
  const info = rasterInfo(bytes);
  if (
    !["image/png", "image/jpeg"].includes(info.mime) ||
    (pngOnly && info.mime !== "image/png") ||
    info.width * info.height > 4194304
  )
    throw Error("仅支持PNG/JPEG静态图片，最多4百万像素、边长4096");
  return info;
}
export function imageFromBase64(base64) {
  if (
    typeof base64 !== "string" ||
    base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 ||
    base64.length % 4 ||
    !/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)
  )
    throw Error("本机图片字节无效");
  const raw = atob(base64),
    bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  imageInfo(bytes, { pngOnly: true });
  return bytes;
}
