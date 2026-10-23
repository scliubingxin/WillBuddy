/** One-way revision-bound bridge. Opaque renderer has no native bridge. */
export function mountOfficePreview(host, invoke) {
  const token = crypto.randomUUID(),
    iframe = document.createElement("iframe");
  iframe.title = "Office 文档预览";
  iframe.className = "office-frame";
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.referrerPolicy = "no-referrer";
  let sent = false,
    disposed = false;
  const finish = () => {
    clearTimeout(timeout);
    window.removeEventListener("message", listener);
  };
  const listener = async (e) => {
    if (
      disposed ||
      e.source !== iframe.contentWindow ||
      e.data?.token !== token
    )
      return;
    if (e.data.kind === "office-complete" && sent) {
      finish();
      return;
    }
    if (e.data.kind !== "office-ready" || sent) return;
    sent = true;
    try {
      const snapshot = await invoke("documentPreview", {
        id: host.dataset.documentId,
        revision: Number(host.dataset.revision),
      });
      if (!disposed && host.isConnected)
        iframe.contentWindow.postMessage(
          { kind: "document", token, ...snapshot },
          "*",
        );
    } catch (err) {
      finish();
      if (!disposed && host.isConnected)
        host.textContent = "无法预览：" + err.message;
    }
  };
  const timeout = setTimeout(() => {
    disposed = true;
    finish();
    if (host.isConnected)
      host.textContent = "预览超时，请重新打开或拆分文档；未修改文件。";
  }, 30000);
  window.addEventListener("message", listener);
  iframe.src = "preview/index.html#" + token;
  host.replaceChildren(iframe);
  return () => {
    disposed = true;
    finish();
    iframe.remove();
  };
}
