/** Bounded formula subset. No eval, Function, host calls, URLs or external names. */
export const formulaFunctions = [
  "SUM",
  "AVERAGE",
  "MIN",
  "MAX",
  "COUNT",
  "IF",
  "ROUND",
];
const failure = (s) => {
  throw Error("不支持或无效的公式：" + s);
};
const err = (error) => ({ error });
const errorValue = (x) =>
  x && typeof x === "object" && typeof x.error === "string";
export function cellAddress(raw) {
  const m = /^\$?([A-Z]{1,3})\$?([1-9][0-9]{0,6})$/i.exec(raw || "");
  if (!m) failure("单元格地址");
  let col = 0;
  for (const c of m[1].toUpperCase()) col = col * 26 + c.charCodeAt(0) - 64;
  const row = Number(m[2]);
  if (col > 16384 || row > 1048576) failure("地址越界");
  return { col, row, address: m[1].toUpperCase() + row };
}
export function parseFormula(source) {
  if (
    typeof source !== "string" ||
    !source.trim() ||
    source.length > 1000 ||
    /[\u0000-\u001f]/.test(source)
  )
    failure("长度或字符");
  source = source.trim().replace(/^=/, "");
  let pos = 0,
    tokens = [],
    nodes = 0,
    depth = 0;
  while (pos < source.length) {
    if (/\s/.test(source[pos])) {
      pos++;
      continue;
    }
    const tail = source.slice(pos);
    let m;
    if ((m = /^"(?:[^"]|"")*"/.exec(tail))) {
      tokens.push({
        type: "string",
        value: m[0].slice(1, -1).replace(/""/g, '"'),
      });
    } else if ((m = /^'(?:[^']|'')*'/.exec(tail))) {
      tokens.push({
        type: "sheet",
        value: m[0].slice(1, -1).replace(/''/g, "'"),
      });
    } else if ((m = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?/.exec(tail))) {
      const v = Number(m[0]);
      if (!Number.isFinite(v)) failure("无穷数字");
      tokens.push({ type: "number", value: v });
    } else if ((m = /^\$?[\p{L}_][\p{L}\p{N}_.$]*/u.exec(tail))) {
      tokens.push({ type: "name", value: m[0] });
    } else if ((m = /^(?:<=|>=|<>|[+\-*/^%=<>()!,:])/.exec(tail))) {
      tokens.push({ type: m[0] });
    } else failure("未知符号 " + source[pos]);
    pos += m[0].length;
    if (tokens.length > 300) failure("表达式过大");
  }
  tokens.push({ type: "end" });
  let at = 0;
  const peek = () => tokens[at],
    take = (t) => (peek().type === t ? (at++, true) : false),
    need = (t) => {
      if (!take(t)) failure("缺少 " + t);
    };
  const node = (n) => {
    if (++nodes > 256) failure("表达式过大");
    return n;
  };
  function primary() {
    if (++depth > 64) failure("嵌套过深");
    let n,
      t = peek();
    if (take("(")) {
      n = expression();
      need(")");
    } else if (t.type === "number" || t.type === "string") {
      at++;
      n = node({ type: "value", value: t.value });
    } else if (t.type === "name" || t.type === "sheet") {
      at++;
      const name = t.value;
      if (t.type === "name" && take("(")) {
        const fn = name.toUpperCase();
        if (!formulaFunctions.includes(fn)) failure("函数 " + fn);
        const args = [];
        if (!take(")")) {
          do {
            args.push(expression());
            if (args.length > 64) failure("参数过多");
          } while (take(","));
          need(")");
        }
        if (
          fn === "IF"
            ? args.length !== 3
            : fn === "ROUND"
              ? args.length !== 2
              : args.length < 1
        )
          failure("函数参数数量");
        n = node({ type: "call", fn, args });
      } else if (
        t.type === "name" &&
        !["!", ":"].includes(peek().type) &&
        /^(TRUE|FALSE)$/i.test(name)
      )
        n = node({ type: "value", value: name.toUpperCase() === "TRUE" });
      else {
        let sheet;
        if (take("!")) {
          sheet = name;
          if (peek().type !== "name") failure("工作表后缺少地址");
          t = peek();
          at++;
        } else {
          if (t.type === "sheet") failure("工作表后缺少!");
          t = { value: name };
        }
        const from = cellAddress(t.value);
        n = node({ type: "ref", sheet, ...from });
        if (take(":")) {
          const end = peek();
          if (end.type !== "name") failure("范围终点");
          at++;
          const to = cellAddress(end.value);
          if (
            to.col < from.col ||
            to.row < from.row ||
            (to.col - from.col + 1) * (to.row - from.row + 1) > 10000
          )
            failure("范围无效或超出10000格");
          n = node({ type: "range", sheet, from, to });
        }
      }
    } else failure("缺少数值或引用");
    depth--;
    return n;
  }
  function unary() {
    if (take("+")) return node({ type: "unary", op: "+", arg: unary() });
    if (take("-")) return node({ type: "unary", op: "-", arg: unary() });
    let n = primary();
    while (take("%")) n = node({ type: "unary", op: "%", arg: n });
    return n;
  }
  function power() {
    let n = unary();
    if (take("^"))
      n = node({ type: "binary", op: "^", left: n, right: power() });
    return n;
  }
  function product() {
    let n = power();
    while (["*", "/"].includes(peek().type)) {
      const op = peek().type;
      at++;
      n = node({ type: "binary", op, left: n, right: power() });
    }
    return n;
  }
  function sum() {
    let n = product();
    while (["+", "-"].includes(peek().type)) {
      const op = peek().type;
      at++;
      n = node({ type: "binary", op, left: n, right: product() });
    }
    return n;
  }
  function expression() {
    let n = sum();
    while (["=", "<>", "<", ">", "<=", ">="].includes(peek().type)) {
      const op = peek().type;
      at++;
      n = node({ type: "binary", op, left: n, right: sum() });
    }
    return n;
  }
  const ast = expression();
  need("end");
  return ast;
}
/** sheets: [{name,cells:Map<address,{value?,formula?}>}]. Returns formula caches. */
export function calculateWorkbook(sheets) {
  if (sheets.length > 10) failure("工作表超过10张");
  let count = 0,
    formulaCount = 0,
    budget = 100000;
  const names = new Map(),
    trees = new Map(),
    cache = new Map(),
    visiting = new Set();
  const key = (s, a) => s + "!" + a;
  sheets.forEach((s, i) => {
    const lower = s.name.toLowerCase();
    if (names.has(lower)) failure("工作表名称重复");
    names.set(lower, i);
    count += s.cells.size;
    for (const [a, c] of s.cells) {
      cellAddress(a);
      if (c.formula !== undefined) {
        formulaCount++;
        trees.set(key(i, a), parseFormula(c.formula));
      }
    }
  });
  if (count > 5000 || formulaCount > 1000)
    failure("计算最多5000个现有单元格/1000条公式");
  function tick() {
    if (--budget < 0) failure("计算量超限");
  }
  function sheetIndex(s, fallback) {
    if (s === undefined) return fallback;
    const i = names.get(s.toLowerCase());
    if (i === undefined) failure("工作表不存在 " + s);
    return i;
  }
  function cell(si, address) {
    tick();
    const k = key(si, address);
    if (cache.has(k)) return cache.get(k);
    const c = sheets[si].cells.get(address);
    if (!c) return null;
    if (!trees.has(k)) return c.value ?? null;
    if (visiting.has(k)) failure("循环引用 " + sheets[si].name + "!" + address);
    if (visiting.size > 200) failure("依赖链过深");
    visiting.add(k);
    const value = evalNode(trees.get(k), si);
    visiting.delete(k);
    if (Array.isArray(value)) failure("范围不能直接作为单元格结果");
    cache.set(k, value);
    return value;
  }
  const numeric = (v) =>
    errorValue(v)
      ? v
      : typeof v === "number"
        ? v
        : typeof v === "boolean"
          ? Number(v)
          : v === null
            ? 0
            : err("#VALUE!");
  const finite = (v) => (Number.isFinite(v) ? v : err("#NUM!"));
  function evalNode(n, si) {
    tick();
    if (n.type === "value") return n.value;
    if (n.type === "ref") return cell(sheetIndex(n.sheet, si), n.address);
    if (n.type === "range") {
      const values = [],
        s = sheetIndex(n.sheet, si);
      for (let row = n.from.row; row <= n.to.row; row++)
        for (let col = n.from.col; col <= n.to.col; col++) {
          let c = col,
            label = "";
          while (c) {
            label = String.fromCharCode(65 + ((c - 1) % 26)) + label;
            c = Math.floor((c - 1) / 26);
          }
          values.push(cell(s, label + row));
        }
      return values;
    }
    if (n.type === "unary") {
      const v = numeric(evalNode(n.arg, si));
      return errorValue(v)
        ? v
        : finite(n.op === "-" ? -v : n.op === "%" ? v / 100 : v);
    }
    if (n.type === "binary") {
      let l = evalNode(n.left, si),
        r = evalNode(n.right, si);
      if (errorValue(l) || errorValue(r)) return errorValue(l) ? l : r;
      if (Array.isArray(l) || Array.isArray(r)) return err("#VALUE!");
      if (["=", "<>", "<", ">", "<=", ">="].includes(n.op)) {
        l = l ?? 0;
        r = r ?? 0;
        if (typeof l !== typeof r) return err("#VALUE!");
        if (typeof l === "string") {
          l = l.toUpperCase();
          r = r.toUpperCase();
        }
        return {
          "=": () => l === r,
          "<>": () => l !== r,
          "<": () => l < r,
          ">": () => l > r,
          "<=": () => l <= r,
          ">=": () => l >= r,
        }[n.op]();
      }
      l = numeric(l);
      r = numeric(r);
      if (errorValue(l) || errorValue(r)) return errorValue(l) ? l : r;
      if (n.op === "/") return r === 0 ? err("#DIV/0!") : finite(l / r);
      if (n.op === "^")
        return Math.abs(r) > 1024 ? err("#NUM!") : finite(l ** r);
      return finite(n.op === "+" ? l + r : n.op === "-" ? l - r : l * r);
    }
    if (n.fn === "IF") {
      const v = evalNode(n.args[0], si);
      if (errorValue(v)) return v;
      if (typeof v !== "boolean" && typeof v !== "number" && v !== null)
        return err("#VALUE!");
      return evalNode(n.args[v ? 1 : 2], si);
    }
    if (n.fn === "ROUND") {
      const v = numeric(evalNode(n.args[0], si)),
        d = numeric(evalNode(n.args[1], si));
      if (errorValue(v) || errorValue(d)) return errorValue(v) ? v : d;
      if (!Number.isInteger(d) || Math.abs(d) > 8) return err("#NUM!");
      const scale = 10 ** d;
      return finite(
        (Math.sign(v) * Math.round((Math.abs(v) + Number.EPSILON) * scale)) /
          scale,
      );
    }
    const values = [];
    for (const arg of n.args) {
      const v = evalNode(arg, si);
      if (errorValue(v)) return v;
      for (const x of Array.isArray(v) ? v : [v]) {
        if (errorValue(x)) return x;
        if (typeof x === "number") values.push(x);
        else if (arg.type !== "ref" && arg.type !== "range" && x !== null) {
          if (typeof x === "boolean") values.push(Number(x));
          else if (
            typeof x === "string" &&
            x.trim() !== "" &&
            Number.isFinite(Number(x))
          )
            values.push(Number(x));
          else if (n.fn !== "COUNT") return err("#VALUE!");
        }
      }
    }
    if (n.fn === "COUNT") return values.length;
    if (n.fn === "SUM") return finite(values.reduce((a, b) => a + b, 0));
    if (n.fn === "AVERAGE")
      return values.length
        ? finite(values.reduce((a, b) => a + b, 0) / values.length)
        : err("#DIV/0!");
    return values.length
      ? n.fn === "MIN"
        ? Math.min(...values)
        : Math.max(...values)
      : 0;
  }
  // Validate the entire dependency graph, including inactive IF branches.
  const graphDone = new Set(),
    graphActive = new Set();
  function graph(k) {
    tick();
    if (graphDone.has(k)) return;
    if (graphActive.has(k)) failure("循环引用 " + k);
    if (graphActive.size > 200) failure("依赖链过深");
    graphActive.add(k);
    const si = Number(k.slice(0, k.indexOf("!")));
    function walk(n) {
      tick();
      if (n.type === "ref") {
        const target = key(sheetIndex(n.sheet, si), n.address);
        if (trees.has(target)) graph(target);
      } else if (n.type === "range") {
        const s = sheetIndex(n.sheet, si);
        for (let r = n.from.row; r <= n.to.row; r++)
          for (let c = n.from.col; c <= n.to.col; c++) {
            tick();
            let x = c,
              label = "";
            while (x) {
              label = String.fromCharCode(65 + ((x - 1) % 26)) + label;
              x = Math.floor((x - 1) / 26);
            }
            const target = key(s, label + r);
            if (trees.has(target)) graph(target);
          }
      } else {
        if (n.arg) walk(n.arg);
        if (n.left) walk(n.left);
        if (n.right) walk(n.right);
        for (const a of n.args || []) walk(a);
      }
    }
    walk(trees.get(k));
    graphActive.delete(k);
    graphDone.add(k);
  }
  for (const k of trees.keys()) graph(k);
  for (const k of trees.keys()) {
    const at = k.indexOf("!");
    cell(Number(k.slice(0, at)), k.slice(at + 1));
  }
  return { values: cache, formulaCount, visited: 100000 - budget };
}
