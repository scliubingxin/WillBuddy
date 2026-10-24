/** Trusted bootstrap; the original document is confined to a second opaque sandbox. */
(() => {
  const token = location.hash.slice(1);
  let used = false;
  const CSP =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; worker-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  const shim = `(()=>{const make=()=>{const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(String(k))??null,setItem:(k,v)=>{if(String(v).length>1000000)throw Error('临时存储超限');if(m.size>=100&&!m.has(String(k)))throw Error('临时存储超限');m.set(String(k),String(v))},removeItem:k=>m.delete(String(k)),clear:()=>m.clear()}};try{Object.defineProperty(window,'localStorage',{value:make()});Object.defineProperty(window,'sessionStorage',{value:make()})}catch{}document.addEventListener('click',e=>{const a=e.target.closest?.('a');if(a&&!a.getAttribute('href')?.startsWith('#'))e.preventDefault()},true);document.addEventListener('submit',e=>e.preventDefault(),true);})();`;
  addEventListener("message", (e) => {
    if (
      used ||
      e.source !== parent ||
      e.data?.token !== token ||
      e.data.kind !== "html-document"
    )
      return;
    used = true;
    if (typeof e.data.source !== "string" || e.data.source.length > 1048576) {
      document.querySelector("#status").textContent =
        "HTML超出1 MiB预览范围，未截断原文。";
      return;
    }
    const parsed = new DOMParser().parseFromString(e.data.source, "text/html");
    // Preserve markup, CSS, inline scripts and embedded images, but never source CSP/base/refresh.
    parsed
      .querySelectorAll("base,meta[http-equiv]")
      .forEach((el) => el.remove());
    const policy = parsed.createElement("meta");
    policy.httpEquiv = "Content-Security-Policy";
    policy.content = CSP;
    parsed.head.prepend(policy);
    const referrer = parsed.createElement("meta");
    referrer.name = "referrer";
    referrer.content = "no-referrer";
    policy.after(referrer);
    const init = parsed.createElement("script");
    init.textContent = shim;
    referrer.after(init);
    const child = document.createElement("iframe");
    child.title = "HTML 交互内容";
    child.sandbox = "allow-scripts";
    child.referrerPolicy = "no-referrer";
    child.addEventListener(
      "load",
      () => parent.postMessage({ kind: "html-complete", token }, "*"),
      { once: true },
    );
    child.srcdoc = "<!doctype html>" + parsed.documentElement.outerHTML;
    document.querySelector("#status").remove();
    document.body.append(child);
  });
  parent.postMessage({ kind: "html-ready", token }, "*");
})();
