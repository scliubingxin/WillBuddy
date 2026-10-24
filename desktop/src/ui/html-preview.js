/** Full local document only; no grant, model, Node or native API is passed into the frame. */
export function mountHtmlPreview(host) {
  const doc = host.ownerDocument,
    win = doc.defaultView,
    source = host.dataset.htmlSource;
  if (typeof source !== "string" || source.length > 1048576) {
    host.textContent = "HTML超过1 MiB预览范围，未截断原文。";
    return () => {};
  }
  const frame = doc.createElement("iframe"),
    note = doc.createElement("p"),
    token = win.crypto.randomUUID();
  let disposed = false,
    sent = false,
    timer;
  frame.className = "html-interactive-frame";
  frame.title = "HTML 隔离交互预览";
  frame.sandbox = "allow-scripts";
  frame.referrerPolicy = "no-referrer";
  const finish = () => {
    win.clearTimeout(timer);
    win.removeEventListener("message", listener);
  };
  const fail = () => {
    if (disposed) return;
    disposed = true;
    finish();
    frame.remove();
    note.textContent =
      "交互预览未能启动。可切换静态视图或导出原文；文件未修改。";
  };
  const listener = (e) => {
    if (disposed || e.source !== frame.contentWindow || e.data?.token !== token)
      return;
    if (e.data.kind === "html-ready" && !sent) {
      sent = true;
      win.clearTimeout(timer);
      timer = win.setTimeout(fail, 10000);
      frame.contentWindow.postMessage(
        { kind: "html-document", token, source },
        "*",
      );
    } else if (e.data.kind === "html-complete" && sent) {
      finish();
      note.remove();
    }
  };
  win.addEventListener("message", listener);
  timer = win.setTimeout(fail, 5000);
  note.textContent = "正在启动隔离交互预览…";
  frame.src =
    (win.location.protocol === "file:"
      ? "willbuddy-preview://local/html/index.html#"
      : "html/index.html#") + token;
  host.replaceChildren(note, frame);
  return () => {
    disposed = true;
    finish();
    frame.remove();
  };
}
