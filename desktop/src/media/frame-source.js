import {imageFromBase64} from '../shared/image-bytes.js';
import { mediaUrl } from "../ui/media-policy.js";
const token = location.hash.slice(1),
  status = document.querySelector("#status");
let objectUrl;
let used = false,
  timer,
  media;
const report = (kind, extra = {}) =>
  parent.postMessage({ kind, token, ...extra }, "*");
function fail() {
  clearTimeout(timer);
  if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=undefined;}
  if (media) {
    media.removeAttribute("src");
    if (media.tagName === "VIDEO") media.load();
    media.remove();
  }
  status.hidden = false;
  status.textContent =
    "媒体加载失败或超时。请检查直链、跨域许可、网络或格式后重试。";
  report("media-error");
}
addEventListener("message", (e) => {
  if (
    used ||
    e.source !== parent ||
    e.data?.token !== token ||
    e.data.kind !== "media-init"
  )
    return;
  used = true;
  let url = mediaUrl(e.data.url);
  const
    kind = e.data.type;
  if(e.data.localImage){try{if(kind!=='image'||e.data.localImage.mime!=='image/png')throw Error();const bytes=imageFromBase64(e.data.localImage.base64);objectUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));url=objectUrl;}catch{fail();return;}}
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
  } else media.alt = "对话图片";
  media.addEventListener("error", fail, { once: true });
  media.addEventListener(
    kind === "image" ? "load" : "loadedmetadata",
    () => {
      clearTimeout(timer);
      status.hidden = true;
      report("media-complete");
    },
    { once: true },
  );
  timer = setTimeout(fail, 15000);
  media.src = url;
  document.body.append(media);
});
addEventListener("pagehide", () => {
  clearTimeout(timer);
  if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=undefined;}
  if (media) {
    media.removeAttribute("src");
    if (media.tagName === "VIDEO") media.load();
  }
});
report("media-ready");
