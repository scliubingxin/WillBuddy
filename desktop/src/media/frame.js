"use strict";
(() => {
  // desktop/src/preview/spreadsheet-images.js
  function rasterInfo(bytes) {
    if (!bytes || bytes.length < 10 || bytes.length > 4 * 1024 * 1024)
      throw Error("\u56FE\u7247\u5B57\u8282\u8D85\u9650\u6216\u7F3A\u5931");
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let width, height, mime;
    if (bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n) && String.fromCharCode(...bytes.slice(12, 16)) === "IHDR") {
      width = v.getUint32(16);
      height = v.getUint32(20);
      mime = "image/png";
    } else if (["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))) {
      width = v.getUint16(6, true);
      height = v.getUint16(8, true);
      mime = "image/gif";
    } else if (bytes[0] === 255 && bytes[1] === 216) {
      for (let i = 2; i + 8 < Math.min(bytes.length, 262144); ) {
        if (bytes[i++] !== 255) throw Error("JPEG\u6807\u8BB0\u65E0\u6548");
        while (bytes[i] === 255) i++;
        const marker = bytes[i++];
        if (marker === 217 || marker === 218) break;
        const len = v.getUint16(i);
        if (len < 2 || i + len > bytes.length) throw Error("JPEG\u957F\u5EA6\u65E0\u6548");
        if ([
          192,
          193,
          194,
          195,
          197,
          198,
          199,
          201,
          202,
          203,
          205,
          206,
          207
        ].includes(marker)) {
          height = v.getUint16(i + 3);
          width = v.getUint16(i + 5);
          mime = "image/jpeg";
          break;
        }
        i += len;
      }
    }
    if (!mime || !width || !height || width > 4096 || height > 4096 || width * height > 16777216)
      throw Error("\u56FE\u7247\u683C\u5F0F\u6216\u50CF\u7D20\u8303\u56F4\u4E0D\u652F\u6301\uFF08PNG/JPEG/GIF\uFF0C\u6700\u59274096\xD74096\uFF09");
    return { width, height, mime };
  }

  // desktop/src/shared/image-bytes.js
  var MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  function imageInfo(bytes, { pngOnly = false } = {}) {
    if (!(bytes instanceof Uint8Array) || bytes.length > MAX_IMAGE_BYTES) throw Error("\u56FE\u7247\u6700\u591A2 MiB");
    const info = rasterInfo(bytes);
    if (!["image/png", "image/jpeg"].includes(info.mime) || pngOnly && info.mime !== "image/png" || info.width * info.height > 4194304) throw Error("\u4EC5\u652F\u6301PNG/JPEG\u9759\u6001\u56FE\u7247\uFF0C\u6700\u591A4\u767E\u4E07\u50CF\u7D20\u3001\u8FB9\u957F4096");
    return info;
  }
  function imageFromBase64(base64) {
    if (typeof base64 !== "string" || base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || base64.length % 4 || !/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) throw Error("\u672C\u673A\u56FE\u7247\u5B57\u8282\u65E0\u6548");
    const raw = atob(base64), bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    imageInfo(bytes, { pngOnly: true });
    return bytes;
  }

  // desktop/src/ui/media-policy.js
  function mediaUrl(value) {
    if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u0020\\]/.test(value))
      return null;
    try {
      const u = new URL(value), h = u.hostname.toLowerCase();
      if (u.protocol !== "https:" || u.username || u.password || u.port && u.port !== "443" || !h.includes(".") || h.endsWith(".") || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(h) || /^[\d.]+$/.test(h) || h.includes(":") || h.startsWith("["))
        return null;
      return u.href;
    } catch {
      return null;
    }
  }

  // desktop/src/media/frame-source.js
  var token = location.hash.slice(1);
  var status = document.querySelector("#status");
  var objectUrl;
  var used = false;
  var timer;
  var media;
  var report = (kind, extra = {}) => parent.postMessage({ kind, token, ...extra }, "*");
  function fail() {
    clearTimeout(timer);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = void 0;
    }
    if (media) {
      media.removeAttribute("src");
      if (media.tagName === "VIDEO") media.load();
      media.remove();
    }
    status.hidden = false;
    status.textContent = "\u5A92\u4F53\u52A0\u8F7D\u5931\u8D25\u6216\u8D85\u65F6\u3002\u8BF7\u68C0\u67E5\u76F4\u94FE\u3001\u8DE8\u57DF\u8BB8\u53EF\u3001\u7F51\u7EDC\u6216\u683C\u5F0F\u540E\u91CD\u8BD5\u3002";
    report("media-error");
  }
  addEventListener("message", (e) => {
    if (used || e.source !== parent || e.data?.token !== token || e.data.kind !== "media-init")
      return;
    used = true;
    let url = mediaUrl(e.data.url);
    const kind = e.data.type;
    if (e.data.localImage) {
      try {
        if (kind !== "image" || e.data.localImage.mime !== "image/png") throw Error();
        const bytes = imageFromBase64(e.data.localImage.base64);
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
        url = objectUrl;
      } catch {
        fail();
        return;
      }
    }
    if (!url || !["image", "video"].includes(kind)) {
      fail();
      return;
    }
    media = document.createElement(kind === "image" ? "img" : "video");
    media.crossOrigin = "anonymous";
    media.referrerPolicy = "no-referrer";
    if (kind === "video") {
      media.controls = true;
      media.playsInline = true;
      media.preload = "metadata";
      media.setAttribute("disablepictureinpicture", "");
    } else media.alt = "\u5BF9\u8BDD\u56FE\u7247";
    media.addEventListener("error", fail, { once: true });
    media.addEventListener(
      kind === "image" ? "load" : "loadedmetadata",
      () => {
        clearTimeout(timer);
        status.hidden = true;
        report("media-complete");
      },
      { once: true }
    );
    timer = setTimeout(fail, 15e3);
    media.src = url;
    document.body.append(media);
  });
  addEventListener("pagehide", () => {
    clearTimeout(timer);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = void 0;
    }
    if (media) {
      media.removeAttribute("src");
      if (media.tagName === "VIDEO") media.load();
    }
  });
  report("media-ready");
})();
