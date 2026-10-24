import { escape } from "./markdown.js";
export function imageCards(images = []) {
  return images
    .slice(0, 3)
    .map(
      (i) =>
        `<figure class="chat-media local-image"><figcaption>${escape(i.name)}</figcaption><button type="button" class="media-load" data-media-kind="image" data-image-id="${escape(i.id)}">查看本机图片</button><small>${Number(i.width)} × ${Number(i.height)} · 离线查看</small></figure>`,
    )
    .join("");
}
