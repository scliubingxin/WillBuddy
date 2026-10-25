import { imageInfo, imageInputInfo } from "../src/shared/image-bytes.js";
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
      bytes = await readDocumentSource(path, { noFollow: true,maxBytes:32*1024*1024,label:"图片" });
    imageInputInfo(bytes);
    if (win.isDestroyed?.()) throw Error("窗口已关闭");
    return images.importFile(path.split(/[\\/]/).at(-1), bytes);
  };
}
export function normalizeNativeImage(nativeImage, bytes) {
  imageInputInfo(bytes);
  const image = nativeImage.createFromBuffer(Buffer.from(bytes), {
    scaleFactor: 1,
  });
  if (image.isEmpty()) throw Error("无法解码该图片");
  const size = image.getSize(1);
  if(!size.width||!size.height||size.width>32768||size.height>32768||size.width*size.height>67108864)throw Error("图片解码尺寸无效或超过64百万像素");
  let ratio=Math.min(1,4096/size.width,4096/size.height,Math.sqrt(16777216/(size.width*size.height)));
  for(let attempt=0;attempt<12;attempt++){
    const width=Math.max(1,Math.floor(size.width*ratio)),height=Math.max(1,Math.floor(size.height*ratio));
    const resized=width===size.width&&height===size.height?image:image.resize({width,height,quality:'best'});
    const png=resized.toPNG();
    if(png.length<=4*1024*1024){const info=imageInfo(png,{pngOnly:true});if(info.width!==width||info.height!==height)throw Error('图片缩放尺寸校验失败');return png;}
    ratio*=0.8;
  }
  throw Error('图片自动压缩失败，请换一张图片');
}
