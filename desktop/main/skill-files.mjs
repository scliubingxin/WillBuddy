import path from "node:path";
import { readDocumentSource } from "./document-files.mjs";
export function createSkillImporter({ dialog, getWindow, library }) {
  return async () => {
    const win = getWindow();
    if (!win || win.isDestroyed?.()) throw Error("技能上传窗口不可用");
    const result = await dialog.showOpenDialog(win, {
      title: "上传 Skill",
      properties: ["openFile"],
      filters: [{ name: "Skill Markdown / ZIP", extensions: ["md", "zip"] }],
    });
    if (result.canceled) return null;
    if (result.filePaths?.length !== 1) throw Error("每次选择一个技能包");
    const source = result.filePaths[0],
      bytes = await readDocumentSource(source, { noFollow: true,maxBytes:32*1024*1024,label:"Skill文件" });
    if (win.isDestroyed?.()) throw Error("窗口已关闭");
    return library.importSkill(path.basename(source), bytes);
  };
}
