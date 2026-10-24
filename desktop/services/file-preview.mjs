import { readGranted } from "../core.mjs";
export async function readFilePreview(store, p, read = readGranted) {
  const grant = store.data.folders.find((f) => f.id === p.folderId);
  if (!grant) throw Error("文件夹授权已撤销");
  const path = grant.path;
  const value = await read(store.data.folders, p.folderId, p.relative, {
    preview: true,
  });
  if (!store.data.folders.some((f) => f.id === p.folderId && f.path === path))
    throw Error("预览读取期间文件夹授权已撤销");
  return value;
}
