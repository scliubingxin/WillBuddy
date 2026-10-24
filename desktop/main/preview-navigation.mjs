/** Main-workspace frames may load fixed internal viewers or srcdoc, never browse remote URLs. */
export function allowPreviewNavigation(value) {
  if (value === "about:blank" || value === "about:srcdoc") return true;
  try {
    const u = new URL(value);
    return (
      u.protocol === "willbuddy-preview:" &&
      u.hostname === "local" &&
      !u.port &&
      !u.username &&
      !u.password &&
      !u.search &&
      ["/index.html", "/media/index.html", "/html/index.html"].includes(
        u.pathname,
      )
    );
  } catch {
    return false;
  }
}
export function protectPreviewNavigation(contents) {
  contents.on("will-frame-navigate", (event) => {
    if (event.isMainFrame || !allowPreviewNavigation(event.url))
      event.preventDefault();
  });
}
