/** Actual Chromium driver for the real GenOffice engine; Electron adapter is not exercised. */
export async function conversionDriver(
  browser,
  { onRequest = () => {}, onClean = () => {} } = {},
) {
  const context = await browser.newContext(),
    page = await context.newPage();
  let closed = false;
  await context.route("**/*", async (r) => {
    onRequest(r.request().url());
    await r.abort();
  });
  await page.goto("data:text/html,<html><body></body></html>");
  return {
    async setViewport({ width, height }) {
      await page.setViewportSize({ width, height });
    },
    async goto(url) {
      await page.goto(url);
      onClean(await page.content());
    },
    async evaluate(fn, arg) {
      return page.evaluate(fn, arg);
    },
    async addScript(source) {
      await page.evaluate(source);
    },
    async addInitScript(source) {
      await page.addInitScript(source);
    },
    async screenshot(options = {}) {
      return page.screenshot(options);
    },
    async screenshotElement(selector, options = {}) {
      const node = page.locator(selector).first();
      if (!(await node.count())) return null;
      const box = await node.boundingBox();
      return box && box.width > 0 && box.height > 0
        ? page.screenshot({ ...options, clip: box })
        : null;
    },
    async elementExists(selector) {
      return !!(await page.locator(selector).count());
    },
    async close() {
      if (!closed) {
        closed = true;
        await context.close();
      }
    },
  };
}
