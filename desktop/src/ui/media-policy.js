/** No local files, inline payloads, credentials or private-network media. */
export function mediaUrl(value) {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /[\u0000-\u0020\\]/.test(value)
  )
    return null;
  try {
    const u = new URL(value),
      h = u.hostname.toLowerCase();
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      (u.port && u.port !== "443") ||
      !h.includes(".") ||
      h.endsWith(".") ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(h) ||
      /^[\d.]+$/.test(h) ||
      h.includes(":") ||
      h.startsWith("[")
    )
      return null;
    return u.href;
  } catch {
    return null;
  }
}
export function mediaType(url) {
  try {
    return /\.(?:mp4|webm|ogv)$/i.test(new URL(url).pathname) ? "video" : null;
  } catch {
    return null;
  }
}
