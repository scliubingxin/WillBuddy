const XDR =
  "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const P = "http://schemas.openxmlformats.org/package/2006/relationships";
const elements = (e, ns, n) => [...e.getElementsByTagNameNS(ns, n)];
const child = (e, n) =>
  [...e.children].find((c) => c.namespaceURI === XDR && c.localName === n);
function integer(value, max, label) {
  if (!/^[0-9]+$/.test(value || "")) throw Error("图片" + label + "无效");
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n > max)
    throw Error("图片" + label + "超出预览范围");
  return n;
}
export function resolveImagePart(source, target) {
  if (
    !target ||
    /[\\:%?#\u0000-\u0020]/.test(target) ||
    target.startsWith("//")
  )
    throw Error("图片关系路径无效");
  const parts = target.startsWith("/") ? [] : source.split("/").slice(0, -1);
  for (const p of target.split("/")) {
    if (p === "." || p === "") continue;
    if (p === "..") {
      if (!parts.length) throw Error("图片关系越界");
      parts.pop();
    } else parts.push(p);
  }
  const result = parts.join("/");
  if (!result.startsWith("xl/")) throw Error("图片关系越界");
  return result;
}
function relationships(files, source, parse) {
  const slash = source.lastIndexOf("/"),
    part =
      source.slice(0, slash + 1) + "_rels/" + source.slice(slash + 1) + ".rels";
  if (!files[part]) throw Error("图片关系部件缺失");
  const map = new Map();
  for (const e of elements(parse(part), P, "Relationship")) {
    const id = e.getAttribute("Id");
    if (!id || map.has(id)) throw Error("图片关系ID重复或缺失");
    if (
      e.getAttribute("TargetMode") &&
      e.getAttribute("TargetMode") !== "Internal"
    )
      throw Error("不支持外部图片关系");
    map.set(id, {
      part: resolveImagePart(source, e.getAttribute("Target")),
      type: e.getAttribute("Type"),
    });
  }
  return map;
}
/** Sniff raster dimensions before the browser decoder sees compressed images. */
export function rasterInfo(bytes) {
  if (!bytes || bytes.length < 10 || bytes.length > 4 * 1024 * 1024)
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
    !mime ||
    !width ||
    !height ||
    width > 4096 ||
    height > 4096 ||
    width * height > 16777216
  )
    throw Error("图片格式或像素范围不支持（PNG/JPEG/GIF，最大4096×4096）");
  return { width, height, mime };
}
function marker(e) {
  if (!e) throw Error("图片锚点缺失");
  const value = (n) => child(e, n)?.textContent;
  return {
    col: integer(value("col"), 127, "列锚点"),
    row: integer(value("row"), 4999, "行锚点"),
    colOff: integer(value("colOff"), 285750000, "列偏移") / 9525,
    rowOff: integer(value("rowOff"), 285750000, "行偏移") / 9525,
  };
}
export function imageBox(image, x, y) {
  const point = (m) => {
    if (m.col >= x.length - 1 || m.row >= y.length - 1)
      throw Error("图片锚点不在网格内");
    return { x: x[m.col] + m.colOff, y: y[m.row] + m.rowOff };
  };
  const origin = image.from ? point(image.from) : image.pos;
  const end = image.to
    ? point(image.to)
    : { x: origin.x + image.ext.width, y: origin.y + image.ext.height };
  const box = {
    left: origin.x,
    top: origin.y,
    width: end.x - origin.x,
    height: end.y - origin.y,
  };
  if (
    Object.values(box).some((n) => !Number.isFinite(n) || n < 0) ||
    box.width === 0 ||
    box.height === 0 ||
    end.x > 30000 ||
    end.y > 150000
  )
    throw Error("图片尺寸或位置超出预览范围");
  return box;
}
/** Read only images actually referenced by this worksheet; never enumerate xl/media. */
export function sheetImages(
  files,
  sheetPart,
  sheet,
  parse,
  budget = { count: 0, pixels: 0 },
) {
  const drawings = elements(
    sheet,
    "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "drawing",
  );
  if (!drawings.length) return { images: [], unsupported: 0 };
  if (drawings.length !== 1) throw Error("工作表绘图引用数量不支持");
  const rels = relationships(files, sheetPart, parse),
    rel = rels.get(drawings[0].getAttributeNS(R, "id"));
  if (
    !rel ||
    rel.type !== R + "/drawing" ||
    !/^xl\/drawings\/[^/]+\.xml$/.test(rel.part)
  )
    throw Error("工作表绘图关系无效");
  const drawing = parse(rel.part),
    images = [];
  let media;
  let unsupported = 0;
  for (const anchor of [...drawing.documentElement.children]) {
    if (
      anchor.namespaceURI !== XDR ||
      !["oneCellAnchor", "twoCellAnchor", "absoluteAnchor"].includes(
        anchor.localName,
      )
    )
      throw Error("图片锚点类型不支持");
    const pics = elements(anchor, XDR, "pic");
    if (
      pics.length !== 1 ||
      [...anchor.children].some(
        (e) =>
          e.namespaceURI === XDR &&
          !["pic", "from", "to", "pos", "ext", "clientData"].includes(
            e.localName,
          ),
      )
    ) {
      unsupported++;
      continue;
    }
    const pic = pics[0],
      blips = elements(pic, A, "blip");
    if (blips.length !== 1 || blips[0].getAttributeNS(R, "link"))
      throw Error("图片引用无效");
    if (
      elements(pic, A, "srcRect").some((e) =>
        [...e.attributes].some((a) => a.value !== "0"),
      ) ||
      elements(pic, A, "xfrm").some((e) =>
        ["rot", "flipH", "flipV"].some(
          (a) =>
            e.hasAttribute(a) && !["0", "false"].includes(e.getAttribute(a)),
        ),
      )
    )
      throw Error("图片裁剪/旋转/翻转暂不支持");
    media ||= relationships(files, rel.part, parse);
    const mr = media.get(blips[0].getAttributeNS(R, "embed"));
    if (
      !mr ||
      mr.type !== R + "/image" ||
      !/^xl\/media\/[^/]+\.(png|jpe?g|gif)$/i.test(mr.part)
    )
      throw Error("图片关系或格式不支持");
    const data = files[mr.part],
      info = rasterInfo(data);
    budget.count++;
    budget.pixels += info.width * info.height;
    if (budget.count > 32 || budget.pixels > 33554432)
      throw Error("工作簿图片超过32张或3200万像素预览限制");
    const image = {
      data,
      mime: info.mime,
      part: mr.part,
      kind: anchor.localName,
    };
    if (anchor.localName === "absoluteAnchor") {
      const pos = child(anchor, "pos");
      image.pos = {
        x: integer(pos?.getAttribute("x"), 285750000, "绝对横坐标") / 9525,
        y: integer(pos?.getAttribute("y"), 1428750000, "绝对纵坐标") / 9525,
      };
    } else image.from = marker(child(anchor, "from"));
    if (anchor.localName === "twoCellAnchor")
      image.to = marker(child(anchor, "to"));
    else {
      const ext = child(anchor, "ext");
      image.ext = {
        width: integer(ext?.getAttribute("cx"), 285750000, "宽度") / 9525,
        height: integer(ext?.getAttribute("cy"), 1428750000, "高度") / 9525,
      };
    }
    images.push(image);
  }
  return { images, unsupported };
}
