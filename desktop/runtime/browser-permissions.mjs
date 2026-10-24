import { validateWebUrl } from "./browser.mjs";
/** Volatile grants: exact model run + exact scheme/host/port, never persisted/replayed. */
export function createBrowserPermissions({ maxGrants = 100 } = {}) {
  const grants = new Map();
  let revision = 0;
  const key = (scope) => JSON.stringify([scope.runId, scope.origin]);
  return {
    scope(name, args, { runId, readScope, prepared } = {}) {
      if (!runId || !name.startsWith("browser_") || args.external === true)
        return null;
      const url =
        name === "browser_open" ? args.url : readScope?.url || prepared?.url;
      if (!url) return null;
      const origin = new URL(validateWebUrl(url)).origin;
      if (name === "browser_click")
        for (const destination of [
          prepared?.target?.href,
          prepared?.target?.formAction,
        ]) {
          if (
            destination &&
            new URL(validateWebUrl(destination)).origin !== origin
          )
            return null;
        }
      return { runId, origin, revision };
    },
    has(scope) {
      return !!scope && scope.revision === revision && grants.has(key(scope));
    },
    allow(scope) {
      if (scope.revision !== revision)
        throw Error("浏览器授权已撤销，请重新确认");
      if (grants.size >= maxGrants) grants.delete(grants.keys().next().value);
      grants.set(key(scope), Date.now());
    },
    check(scope) {
      if (scope && scope.revision !== revision)
        throw Error("浏览器授权已撤销，操作已阻止");
    },
    release(runId) {
      for (const k of grants.keys())
        if (JSON.parse(k)[0] === runId) grants.delete(k);
    },
    revoke() {
      revision++;
      grants.clear();
    },
  };
}
