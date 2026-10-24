/** Preserve a connected Office frame during unrelated workspace renders.
 * Never detach/reparent its ancestors: that resets sandboxed iframe documents.
 * One visible preview only; closing/switching/version changes dispose it.
 */
export function createOfficeWorkspace(app, mount) {
  let scope, stop, lastMessages;
  const key = (host) =>
    host && JSON.stringify([host.dataset.documentId, host.dataset.revision,host.dataset.htmlSource]);
  function update(markup, nextScope) {
    const doc = app.ownerDocument,
      template = doc.createElement("template");
    template.innerHTML = markup;
    const next = template.content,
      host = app.querySelector(".office-host,.html-host"),
      nextHost = next.querySelector(".office-host,.html-host");
    const panel = app.querySelector(".session-panel"),
      nextPanel = next.querySelector(".session-panel");
    const scroll = panel?.querySelector(".preview-scroll"),
      nextScroll = nextPanel?.querySelector(".preview-scroll");
    const selectors = [".sidebar", ".topbar", ".workspace", ".workbench"];
    const oldMessages = app.querySelector(".messages-scroll"),
      newMessages = next.querySelector(".messages-scroll");
    const messagesKey = newMessages?.innerHTML;
    const keepChat =
      scope === nextScope &&
      oldMessages?.querySelector(".chat-media-frame") &&
      messagesKey === lastMessages &&
      oldMessages.parentElement?.classList.contains("chat") &&
      newMessages?.parentElement?.classList.contains("chat");
    function updateWorkspace() {
      const old = app.querySelector(".workspace"),
        fresh = next.querySelector(".workspace");
      if (!keepChat) {
        old.replaceWith(fresh);
        return;
      }
      const chat = oldMessages.parentElement,
        nchat = newMessages.parentElement;
      for (const child of [...chat.children])
        if (child !== oldMessages) child.remove();
      let before = true;
      for (const child of [...nchat.children]) {
        if (child === newMessages) {
          before = false;
          continue;
        }
        if (before) chat.insertBefore(child, oldMessages);
        else chat.append(child);
      }
      old.className = fresh.className;
      chat.className = nchat.className;
    }
    const layout = [".sidebar", ".topbar", ".workspace", ".workbench"].every(
      (s) => app.querySelector(s) && next.querySelector(s),
    );
    const reusable =
      scope === nextScope &&
      host?.isConnected &&
      key(host) === key(nextHost) &&
      scroll?.contains(host) &&
      nextScroll?.contains(nextHost) &&
      scroll.parentElement === panel &&
      nextScroll.parentElement === nextPanel &&
      selectors.every((s) => app.querySelector(s) && next.querySelector(s));
    if (reusable) {
      // The frame, host, scroll container, panel and workbench stay connected.
      for (const child of [...panel.children])
        if (child !== scroll) child.remove();
      let before = true;
      for (const child of [...nextPanel.children]) {
        if (child === nextScroll) {
          before = false;
          continue;
        }
        if (before) panel.insertBefore(child, scroll);
        else panel.append(child);
      }
      panel.className = nextPanel.className;
      const article = scroll.querySelector(".document-preview"),
        nextArticle = nextScroll.querySelector(".document-preview");
      if (article && nextArticle) article.className = nextArticle.className;
      for (const s of [".sidebar", ".topbar"])
        app.querySelector(s).replaceWith(next.querySelector(s));
      updateWorkspace();
      app.querySelector(".workbench").className =
        next.querySelector(".workbench").className;
    } else if (keepChat && layout && !host && !nextHost) {
      for (const s of [".sidebar", ".topbar"])
        app.querySelector(s).replaceWith(next.querySelector(s));
      updateWorkspace();
      const bench = app.querySelector(".workbench"),
        fresh = next.querySelector(".workbench"),
        workspace = app.querySelector(".workspace");
      for (const child of [...bench.children])
        if (child !== workspace) child.remove();
      for (const child of [...fresh.children])
        if (!child.classList.contains("workspace")) bench.append(child);
      bench.className = fresh.className;
    } else {
      stop?.();
      stop = undefined;
      app.replaceChildren(next);
      const current = app.querySelector(".office-host,.html-host");
      if (current) stop = mount(current);
    }
    scope = nextScope;
    lastMessages = messagesKey;
    return Boolean(reusable);
  }
  return {
    update,
    dispose() {
      stop?.();
      stop = undefined;
      scope = undefined;
    },
  };
}
