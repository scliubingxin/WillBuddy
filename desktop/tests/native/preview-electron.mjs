/** Native Electron acceptance: file:// host + opaque preview iframe.
 * --no-sandbox is needed only when the Linux test container runs as root. */
import { app, BrowserWindow, protocol } from "electron";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import {
  previewScheme,
  preparePreviewProtocol,
} from "../../main/preview-protocol.mjs";
import { generateDocument } from "../../runtime/documents.mjs";
protocol.registerSchemesAsPrivileged([previewScheme]);
app.commandLine.appendSwitch("disable-gpu");
let win, dir;
app.whenReady().then(async () => {
  try {
    dir = await mkdtemp(path.join(tmpdir(), "wb-native-preview-"));
    await writeFile(
      path.join(dir, "host.html"),
      `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; frame-src 'self' willbuddy-preview://local; connect-src 'none'"><body></body>`,
    );
    const preview = path.resolve(import.meta.dirname, "../../src/preview");
    protocol.handle(
      previewScheme.scheme,
      await preparePreviewProtocol(preview),
    );
    win = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    const logs = [];
    win.webContents.on("console-message", (_e, _level, message) =>
      logs.push(message),
    );
    await win.loadFile(path.join(dir, "host.html"));
    const bytes = (
      await generateDocument(
        "xlsx",
        JSON.stringify({
          sheets: [
            {
              name: "验收表",
              rows: [
                ["名称", "数量"],
                ["离线预览", 7],
              ],
            },
          ],
        }),
      )
    ).bytes;
    for (const mode of ["file", "protocol"]) {
      const src =
        mode === "file"
          ? pathToFileURL(path.join(preview, "index.html")).href
          : "willbuddy-preview://local/index.html";
      const result = await win.webContents.executeJavaScript(
        `new Promise(resolve=>{const start=performance.now(),token='native-'+${JSON.stringify(mode)},frame=document.createElement('iframe');let ready=false;frame.sandbox='allow-scripts';const timer=setTimeout(()=>finish({timeout:true}),5000);function finish(value){clearTimeout(timer);window.removeEventListener('message',listener);frame.remove();resolve({...value,ready,elapsedMs:performance.now()-start});}function listener(e){if(e.source!==frame.contentWindow||e.data?.token!==token)return;if(e.data.kind==='office-ready'){ready=true;frame.contentWindow.postMessage({kind:'document',token,format:'xlsx',base64:${JSON.stringify(bytes.toString("base64"))}},'*');}if(e.data.kind==='office-complete')finish({completed:true});}window.addEventListener('message',listener);frame.src=${JSON.stringify(src)}+'#'+token;document.body.append(frame);})`,
      );
      console.log(JSON.stringify({ mode, ...result }));
      if (mode === "protocol" && !result.completed)
        throw Error(
          "Native protocol preview did not complete: " + logs.join("\n"),
        );
    }
    console.log(
      "Native Electron file-host fixture finished; not a Mac/real-model acceptance.",
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
