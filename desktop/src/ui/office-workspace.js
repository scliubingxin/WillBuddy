/** Preserve a connected Office frame during unrelated workspace renders.
 * Never detach/reparent its ancestors: that resets sandboxed iframe documents.
 * One visible preview only; closing/switching/version changes dispose it.
 */
export function createOfficeWorkspace(app, mount) {
  let scope, stop;
  const key = host => host && JSON.stringify([host.dataset.documentId, host.dataset.revision]);
  function update(markup, nextScope) {
    const doc = app.ownerDocument, template = doc.createElement('template');
    template.innerHTML = markup;
    const next = template.content, host = app.querySelector('.office-host'), nextHost = next.querySelector('.office-host');
    const panel = app.querySelector('.session-panel'), nextPanel = next.querySelector('.session-panel');
    const scroll = panel?.querySelector('.preview-scroll'), nextScroll = nextPanel?.querySelector('.preview-scroll');
    const selectors = ['.sidebar', '.topbar', '.workspace', '.workbench'];
    const reusable = scope === nextScope && host?.isConnected && key(host) === key(nextHost)
      && scroll?.contains(host) && nextScroll?.contains(nextHost)
      && scroll.parentElement === panel && nextScroll.parentElement === nextPanel
      && selectors.every(s => app.querySelector(s) && next.querySelector(s));
    if (reusable) {
      // The frame, host, scroll container, panel and workbench stay connected.
      for (const child of [...panel.children]) if (child !== scroll) child.remove();
      let before = true;
      for (const child of [...nextPanel.children]) {
        if (child === nextScroll) { before = false; continue; }
        if (before) panel.insertBefore(child, scroll); else panel.append(child);
      }
      panel.className = nextPanel.className;
      const article = scroll.querySelector('.document-preview'), nextArticle = nextScroll.querySelector('.document-preview');
      if (article && nextArticle) article.className = nextArticle.className;
      for (const s of ['.sidebar', '.topbar', '.workspace']) app.querySelector(s).replaceWith(next.querySelector(s));
      app.querySelector('.workbench').className = next.querySelector('.workbench').className;
    } else {
      stop?.(); stop = undefined;
      app.replaceChildren(next);
      const current = app.querySelector('.office-host');
      if (current) stop = mount(current);
    }
    scope = nextScope;
    return Boolean(reusable);
  }
  return { update, dispose() { stop?.(); stop = undefined; scope = undefined; } };
}
