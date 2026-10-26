/** Revision-bound bridge. Fixed app resource route in installed file:// builds. */
export function mountOfficePreview(host, invoke) {
  const doc = host.ownerDocument,
    win = doc.defaultView;
  let stop = () => {};
  function start() {
    stop();
    const token = win.crypto.randomUUID(),
      iframe = doc.createElement("iframe"),
      note = doc.createElement("p");
    iframe.title = "Office 文档预览";
    iframe.className = "office-frame";
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.referrerPolicy = "no-referrer";
    note.className = "preview-loading";
    note.textContent = "正在启动本机预览组件…";
    let sent = false,
      disposed = false,
      timer, snapshot;
    const finish = () => {
      win.clearTimeout(timer);
      win.removeEventListener("message", listener);
    };
    const fail = (message) => {
      if (disposed) return;
      disposed = true;
      finish();
      if (!host.isConnected) return;
      const p = doc.createElement("p"),
        retry = doc.createElement("button");
      p.textContent = message;
      retry.type = "button";
      retry.textContent = "重新加载预览";
      retry.addEventListener("click", start, { once: true });
      host.replaceChildren(p, retry);
    };
    const deadline = (ms, message) => {
      win.clearTimeout(timer);
      timer = win.setTimeout(() => fail(message), ms);
    };
    const listener = async (e) => {
      if (
        disposed ||
        e.source !== iframe.contentWindow ||
        e.data?.token !== token
      )
        return;
      if (e.data.kind === "office-complete" && sent) {
        win.clearTimeout(timer);
        note.remove();
        return;
      }
      if(e.data.kind==='office-selection'&&sent&&snapshot&&['attach','edit'].includes(e.data.action)&&JSON.stringify(e.data.request||{}).length<=20000){
        host.dispatchEvent(new win.CustomEvent('office-selection',{bubbles:true,detail:{action:e.data.action,input:{documentId:host.dataset.documentId,revision:snapshot.revision,sha256:snapshot.sha256,request:e.data.request}}}));return;
      }
      if (e.data.kind !== "office-ready" || sent) return;
      sent = true;
      note.textContent = "正在校验并渲染文件…";
      deadline(15000, "文件预览未在15秒内完成；文件未修改。可重试或导出查看。");
      try {
        snapshot = await invoke("documentPreview", {
          id: host.dataset.documentId,
          revision: Number(host.dataset.revision),
        });
        if (!disposed && host.isConnected)
          iframe.contentWindow.postMessage(
            { kind: "document", token, ...snapshot },
            "*",
          );
      } catch (err) {
        fail("无法读取预览文件：" + err.message);
      }
    };
    deadline(5000, "本机预览组件未能启动，文件尚未开始渲染；请升级后重试。");
    win.addEventListener("message", listener);
    iframe.src =
      (win.location.protocol === "file:"
        ? "willbuddy-preview://local/index.html#"
        : "preview/index.html#") + token;
    host.replaceChildren(note, iframe);
    stop = () => {
      disposed = true;
      finish();
      iframe.remove();
      note.remove();
    };
  }
  start();
  return () => stop();
}
