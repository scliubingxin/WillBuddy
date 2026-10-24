import { mediaUrl } from "./media-policy.js";
/** Media sessions are opened only by a real UI click. Frames get no native bridge. */
export function installChatMedia(doc,{readImage}={}) {
  const win = doc.defaultView,
    sessions = new Set();
  function start(button) {
    const url = mediaUrl(button.dataset.mediaUrl),
      kind = button.dataset.mediaKind,
      card = button.closest(".chat-media");
    if ((!url && !button.dataset.imageId) || !card || !["image", "video"].includes(kind)) return;
    if (sessions.size >= 3 && ![...sessions].some((s) => s.card === card)) {
      const note = doc.createElement("p");
      note.className = "media-error";
      note.textContent = "最多同时打开3项媒体，请先关闭其他媒体。";
      card.append(note);
      return;
    }
    card.querySelector(".media-error")?.remove();
    const old = [...sessions].find((s) => s.card === card);
    old?.stop();
    const frame = doc.createElement("iframe"),
      note = doc.createElement("p"),
      token = win.crypto.randomUUID();
    frame.className = "chat-media-frame";
    frame.title = kind === "video" ? "对话视频播放器" : "对话图片查看器";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.referrerPolicy = "no-referrer";
    let sent = false,
      done = false,
      timer;
    const finish = () => {
      win.clearTimeout(timer);
      win.removeEventListener("message", listener);
    };
    const session = {
      card,
      stop() {
        done = true;
        finish();
        frame.remove();
        note.remove();
        button.disabled = false;
        sessions.delete(session);
      },
    };
    const fail = () => {
      if (done) return;
      session.stop();
      note.className = "media-error";
      note.textContent =
        "媒体未能加载，可再次点击重试；文件地址可能需要登录或不允许跨域。";
      card.append(note);
    };
    const listener = async (e) => {
      if (
        done ||
        !card.isConnected ||
        e.source !== frame.contentWindow ||
        e.data?.token !== token
      )
        return;
      if (e.data.kind === "media-ready" && !sent) {
        sent = true;
        win.clearTimeout(timer);
        timer = win.setTimeout(fail, 16000);
        note.textContent = "正在加载媒体…";
        try{
          const snapshot=button.dataset.imageId ? await readImage?.(button.dataset.imageId) : null;
          if(done||!card.isConnected)return;
          if(button.dataset.imageId&&!snapshot)throw Error('图片读取不可用');
          frame.contentWindow.postMessage({kind:'media-init',token,url,type:kind,...(snapshot?{localImage:snapshot}: {})},'*');
        }catch{fail();}
      } else if (e.data.kind === "media-complete" && sent) {
        finish();
        note.remove();
      } else if (e.data.kind === "media-error" && sent) fail();
    };
    win.addEventListener("message", listener);
    timer = win.setTimeout(fail, 5000);
    frame.src =
      (win.location.protocol === "file:"
        ? "willbuddy-preview://local/media/index.html#"
        : "media/index.html#") + token;
    button.disabled = true;
    note.textContent = "正在启动内置媒体组件…";
    card.append(note, frame);
    sessions.add(session);
    let close = card.querySelector(".media-stop");
    if (!close) {
      close = doc.createElement("button");
      close.type = "button";
      close.className = "media-stop";
      close.textContent = "关闭媒体";
      card.append(close);
      const expand = doc.createElement("button");
      expand.type = "button";
      expand.className = "media-expand";
      expand.textContent = "展开查看";
      card.append(expand);
    }
  }
  const click = (e) => {
    const b = e.target.closest?.(".media-load");
    if (b) {
      start(b);
      return;
    }
    const close = e.target.closest?.(".media-stop");
    if (close)
      [...sessions]
        .find((s) => s.card === close.closest(".chat-media"))
        ?.stop();
    const expand = e.target.closest?.(".media-expand");
    if (expand) {
      const expanded = expand
        .closest(".chat-media")
        .classList.toggle("media-expanded");
      expand.textContent = expanded ? "收起" : "展开查看";
    }
  };
  doc.addEventListener("click", click);
  // Detached UI sessions stop loading/playback; never replay a previously clicked URL.
  const observer = new win.MutationObserver(() => {
    for (const s of sessions) if (!s.card.isConnected) s.stop();
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  const stop = () => {
    for (const s of [...sessions]) s.stop();
    observer.disconnect();
    doc.removeEventListener("click", click);
    win.removeEventListener("pagehide", stop);
  };
  win.addEventListener("pagehide", stop);
  return stop;
}
