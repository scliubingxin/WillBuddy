import { rasterInfo } from "../preview/spreadsheet-images.js";
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export function imageInfo(bytes, { pngOnly = false } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_IMAGE_BYTES)
    throw Error("规范图片最多4 MiB");
  const info = rasterInfo(bytes);
  if (
    !["image/png", "image/jpeg"].includes(info.mime) ||
    (pngOnly && info.mime !== "image/png") ||
    info.width * info.height > 16777216
  )
    throw Error("仅支持PNG/JPEG静态图片，最多16百万像素、边长4096");
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

export function imageInputInfo(bytes) {
  if (!bytes || bytes.length < 10 || bytes.length > 32 * 1024 * 1024)
    throw Error("图片字节超限或缺失");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width, height, mime;
  if (
    bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n) &&
    String.fromCharCode(...bytes.slice(12, 16)) === "IHDR"
  ) {
    width = v.getUint32(16);
    height = v.getUint32(20);
    mime = "image/png";
  } else if (
    ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))
  ) {
    width = v.getUint16(6, true);
    height = v.getUint16(8, true);
    mime = "image/gif";
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    for (let i = 2; i + 8 < Math.min(bytes.length, 262144); ) {
      if (bytes[i++] !== 255) throw Error("JPEG标记无效");
      while (bytes[i] === 255) i++;
      const marker = bytes[i++];
      if (marker === 217 || marker === 218) break;
      const len = v.getUint16(i);
      if (len < 2 || i + len > bytes.length) throw Error("JPEG长度无效");
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      ) {
        height = v.getUint16(i + 3);
        width = v.getUint16(i + 5);
        mime = "image/jpeg";
        break;
      }
      i += len;
    }
  }
  if (
    !["image/png","image/jpeg"].includes(mime) ||
    !width ||
    !height ||
    width > 32768 ||
    height > 32768 ||
    width * height > 67108864
  )
    throw Error("图片格式或像素范围不支持（PNG/JPEG，最大32768×32768）");
  return { width, height, mime };
}
