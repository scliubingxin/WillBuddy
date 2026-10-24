import { normalizeImageFixture } from "../helpers/image-workbook.mjs";
import ExcelJS from "exceljs";
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
          { name: "保留选择", rows: [["选择保持"]] },
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
      if (format === "xlsx") {
        const wb = new ExcelJS.Workbook(),
          sheet = wb.addWorksheet("验收表");
        sheet.addRows(content.sheets[0].rows);
        wb.addWorksheet("保留选择").addRow(["选择保持"]);
        const image = wb.addImage({
          buffer: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
            "base64",
          ),
          extension: "png",
        });
        sheet.getColumn(4).width = 8;
        sheet.getColumn(4).hidden = true;
        sheet.getCell("A5").value = "隐藏行";
        sheet.getRow(5).hidden = true;
        sheet.addImage(image, {
          tl: { col: 1, row: 1 },
          ext: { width: 48, height: 32 },
        });
        sheet.addImage(image, {
          tl: { col: 4, row: 3 },
          br: { col: 6, row: 6 },
        });
        documents.push(
          (
            await docs.importFile(
              "图片验收",
              "xlsx",
              normalizeImageFixture(Buffer.from(await wb.xlsx.writeBuffer())),
            )
          ).document,
        );
        continue;
      }
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
      const child = win.webContents.mainFrame.frames.find((f) =>
        f.url.startsWith("willbuddy-preview://local/index.html"),
      );
      const rendered = await child.executeJavaScript(
        '({ready:document.body.dataset.ready,error:document.body.dataset.error,status:document.querySelector("#status").textContent,text:document.querySelector("#content").textContent,bridge:typeof window.actwill,node:typeof require})',
      );
      const expected = {
        xlsx: "本机直接预览",
        docx: "完整末段",
        pptx: "最后一张",
      }[d.format];
      if (
        rendered.ready !== "true" ||
        rendered.error ||
        !rendered.text.includes(expected) ||
        rendered.bridge !== "undefined" ||
        rendered.node !== "undefined"
      )
        throw Error("预览内容或隔离校验失败 " + JSON.stringify(rendered));
      console.log(
        JSON.stringify({
          nativeContentVerified: true,
          format: d.format,
          ready: rendered.ready,
          noBridge: true,
          noNode: true,
        }),
      );
      if (d.format === "xlsx") {
        const images = await child.executeJavaScript(
          `(()=>{const section=document.querySelector('section:not([hidden])'),imgs=[...section.querySelectorAll('img.spreadsheet-image')],cell=section.querySelector('[data-address=B2]').getBoundingClientRect(),first=imgs[0].getBoundingClientRect();return {count:imgs.length,decoded:imgs.every(i=>i.complete&&i.naturalWidth===1),aligned:Math.abs(first.left-cell.left)<2&&Math.abs(first.top-cell.top)<2,width:first.width,height:first.height};})()`,
        );
        if (
          images.count !== 2 ||
          !images.decoded ||
          !images.aligned ||
          images.width !== 48 ||
          images.height !== 32
        )
          throw Error("图片原生预览失败 " + JSON.stringify(images));
        console.log(JSON.stringify({ nativeImagesVerified: true, ...images }));
        await child.executeJavaScript(
          `document.querySelectorAll('nav button')[1].click();`,
        );
      }
      const beforeReads = reads;
      await win.webContents.executeJavaScript(
        `window.__retainedPreview=document.querySelector('iframe.office-frame');for(let i=0;i<20;i++)document.querySelector('[data-action="sidebarToggle"]').click();`,
      );
      const same = await win.webContents.executeJavaScript(
        `window.__retainedPreview===document.querySelector('iframe.office-frame')`,
      );
      if (
        !same ||
        reads !== beforeReads ||
        !win.webContents.mainFrame.frames.includes(child)
      )
        throw Error("Preview restarted during workspace updates");
      if (d.format === "xlsx") {
        const visible = await child.executeJavaScript(
          `document.querySelector('section:not([hidden])').textContent`,
        );
        if (!visible.includes("选择保持")) throw Error("Sheet selection reset");
      }
      console.log(
        JSON.stringify({
          lifecycleVerified: true,
          format: d.format,
          updates: 20,
          extraBinaryReads: reads - beforeReads,
          sameNativeFrame: true,
        }),
      );
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
