import { app, BrowserWindow, protocol, ipcMain } from "electron";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import {
  previewScheme,
  preparePreviewProtocol,
} from "../../main/preview-protocol.mjs";
import { createRegistrar } from "../../main/ipc.mjs";
import { Store } from "../../core.mjs";
import {
  createDocumentService,
  documentViews,
} from "../../services/documents.mjs";
protocol.registerSchemesAsPrivileged([previewScheme]);
app.commandLine.appendSwitch("disable-gpu");
app.whenReady().then(async () => {
  let win, dir;
  try {
    const root =
      process.argv
        .find((a) => a.startsWith("--fixture-asar="))
        ?.split("=")
        .slice(1)
        .join("=") || path.resolve(import.meta.dirname, "../..");
    protocol.handle(
      previewScheme.scheme,
      await preparePreviewProtocol(path.join(root, "src/preview")),
    );
    dir = await mkdtemp(path.join(tmpdir(), "wb-prod-native-"));
    const store = new Store(dir);
    await store.load();
    const docs = createDocumentService({ store });
    const fixtures = {
      xlsx: {
        sheets: [
          {
            name: "验收表",
            rows: [
              ["名称", "数量"],
              ["本机直接预览", 7],
            ],
          },
        ],
      },
      docx: {
        title: "本机报告",
        blocks: [{ type: "paragraph", text: "完整末段" }],
      },
      pptx: {
        slides: [
          { title: "第一张", bullets: ["内容"] },
          { title: "最后一张", bullets: ["完成"] },
        ],
      },
    };
    const documents = [];
    for (const [format, content] of Object.entries(fixtures)) {
      const prepared = await docs.prepare("document_create", {
        name: "本机-" + format,
        format,
        content: JSON.stringify(content),
      });
      const result = await docs.perform(prepared);
      documents.push(result.document);
    }
    win = new BrowserWindow({
      show: false,
      width: 1380,
      height: 960,
      webPreferences: {
        preload: path.join(root, "preload.cjs"),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
    });
    const entry = pathToFileURL(path.join(root, "src/index.html")).href,
      register = createRegistrar({
        ipcMain,
        getWindow: () => win,
        entryURL: entry,
      });
    let reads = 0;
    register("state", () => ({
      ...structuredClone(store.data),
      documents: documentViews(store.data),
    }));
    register("documentPreview", (p) => {
      reads++;
      return docs.preview(p.id, p.revision);
    });
    await win.loadFile(path.join(root, "src/index.html"));
    for (const d of documents) {
      const result = await win.webContents.executeJavaScript(
        `new Promise(resolve=>{const start=performance.now();let frame;const timeout=setTimeout(()=>done({timeout:true}),7000);function done(result){clearTimeout(timeout);clearInterval(poll);window.removeEventListener('message',message);resolve({...result,elapsedMs:performance.now()-start});}function message(e){if(e.source===frame?.contentWindow&&e.data?.kind==='office-complete')done({completed:true});}window.addEventListener('message',message);const poll=setInterval(()=>{const nav=document.querySelector('.sidebar [data-page="library"]');if(!nav)return;nav.click();const button=document.querySelector('[data-document="${d.id}"] [data-action="documentView"]');if(button){clearInterval(poll);button.click();frame=document.querySelector('iframe.office-frame');}},25);})`,
      );
      console.log(
        JSON.stringify({
          production: true,
          asar: root.endsWith(".asar"),
          format: d.format,
          ...result,
        }),
      );
      if (!result.completed) throw Error("生产预览失败 " + d.format);
      const child=win.webContents.mainFrame.frames.find(f=>f.url.startsWith('willbuddy-preview://local/index.html'));
      const rendered=await child.executeJavaScript('({ready:document.body.dataset.ready,error:document.body.dataset.error,text:document.querySelector("#content").textContent,bridge:typeof window.actwill,node:typeof require})');
      const expected={xlsx:'本机直接预览',docx:'完整末段',pptx:'最后一张'}[d.format];
      if(rendered.ready!=='true'||rendered.error||!rendered.text.includes(expected)||rendered.bridge!=='undefined'||rendered.node!=='undefined')throw Error('预览内容或隔离校验失败 '+JSON.stringify(rendered));
      console.log(JSON.stringify({nativeContentVerified:true,format:d.format,ready:rendered.ready,noBridge:true,noNode:true}));
    }
    if (reads !== 3) throw Error("Unexpected binary reads " + reads);
    console.log(
      "PASS: actual Electron file:// production UI, actual preload/IPC registrar, real DOCX/XLSX/PPTX, isolated custom protocol. Linux fixture data; no Mac/model conclusion.",
    );
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    win?.destroy();
    if (dir) await rm(dir, { recursive: true, force: true });
    app.exit(process.exitCode || 0);
  }
});
