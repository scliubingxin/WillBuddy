import { mcpUrl } from "../services/agent-profile.mjs";
/** Bounded per-run Streamable HTTP client. No subprocess, credentials, reconnect or hidden retry. */
export class McpClient {
  constructor(url, { fetcher = fetch } = {}) {
    this.url = mcpUrl(url);
    this.fetcher = fetcher;
    this.sequence = 0;
  }
  async rpc(method, params, signal, { notification = false } = {}) {
    signal?.throwIfAborted();
    const id = ++this.sequence,
      body = {
        jsonrpc: "2.0",
        ...(notification ? {} : { id }),
        method,
        ...(params ? { params } : {}),
      };
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(this.version ? { "MCP-Protocol-Version": this.version } : {}),
      ...(this.session ? { "Mcp-Session-Id": this.session } : {}),
    };
    const timed = AbortSignal.timeout(15000),
      combined = signal ? AbortSignal.any([signal, timed]) : timed;
    const r = await this.fetcher(this.url, {
      method: "POST",
      redirect: "error",
      credentials: "omit",
      headers,
      body: JSON.stringify(body),
      signal: combined,
    });
    if (!r.ok) throw Error("MCP HTTP " + r.status);
    const session = r.headers.get("mcp-session-id");
    if (session) {
      if (!/^[\x21-\x7e]{1,256}$/.test(session)) throw Error("MCP会话标识无效");
      if (this.session && session !== this.session)
        throw Error("MCP会话发生变化");
      this.session = session;
    }
    if (notification) {
      await r.body?.cancel();
      return;
    }
    const reader = r.body?.getReader();
    if (!reader) throw Error("MCP响应为空");
    const decoder = new TextDecoder(),
      sse = (r.headers.get("content-type") || "").includes("text/event-stream");
    let input = "",
      size = 0;
    const check = (value) => {
      if (value?.jsonrpc !== "2.0" || value.id !== id)
        throw Error("MCP响应ID不匹配或不支持服务端请求");
      if (value.error) throw Error("MCP远端错误 " + String(value.error.code));
      if (!Object.hasOwn(value, "result")) throw Error("MCP结果无效");
      return value.result;
    };
    try {
      while (true) {
        combined.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) {
          input += decoder.decode();
          break;
        }
        size += value.byteLength;
        if (size > 1048576) throw Error("MCP响应超过1MiB");
        input += decoder.decode(value, { stream: true });
        if (sse) {
          input = input.replace(/\r\n/g, "\n");
          let split;
          while ((split = input.indexOf("\n\n")) >= 0) {
            const event = input.slice(0, split);
            input = input.slice(split + 2);
            const data = event
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trimStart())
              .join("\n");
            if (!data) continue;
            const v = JSON.parse(data);
            if (v.id === id) return check(v);
            if (v.method && !v.id) continue;
            throw Error("不支持的MCP服务端请求");
          }
        }
      }
      if (sse) throw Error("MCP事件流缺少对应结果");
      return check(JSON.parse(input));
    } finally {
      await reader.cancel().catch(() => {});
    }
  }
  async discover(signal) {
    const init = await this.rpc(
      "initialize",
      {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "WillBuddy", version: "0.22.0" },
      },
      signal,
    );
    if (!["2025-06-18", "2025-03-26"].includes(init.protocolVersion))
      throw Error("不支持的MCP协议版本");
    this.version = init.protocolVersion;
    await this.rpc("notifications/initialized", undefined, signal, {
      notification: true,
    });
    const tools = [];
    let cursor;
    const cursors = new Set();
    for (let i = 0; i < 4; i++) {
      const result = await this.rpc(
        "tools/list",
        cursor ? { cursor } : undefined,
        signal,
      );
      if (!Array.isArray(result.tools)) throw Error("MCP工具目录无效");
      tools.push(...result.tools);
      if (tools.length > 16) throw Error("每个MCP最多16项工具");
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
      if (
        typeof cursor !== "string" ||
        cursor.length > 1000 ||
        cursors.has(cursor) ||
        i === 3
      )
        throw Error("MCP分页无效");
      cursors.add(cursor);
    }
    const seen = new Set();
    for (const t of tools) {
      t.description ??= "";
      if (
        !/^[A-Za-z0-9_-]{1,48}$/.test(t.name) ||
        seen.has(t.name) ||
        typeof t.description !== "string" ||
        t.description.length > 2000 ||
        t.inputSchema?.type !== "object" ||
        JSON.stringify(t.inputSchema).length > 12000 ||
        /"\$(?:ref|id|schema)"/.test(JSON.stringify(t.inputSchema))
      )
        throw Error("MCP工具定义不支持或超限");
      seen.add(t.name);
    }
    return tools;
  }
  async call(name, args, signal) {
    return this.rpc("tools/call", { name, arguments: args }, signal);
  }
  async close() {
    if (this.session) {
      await this.fetcher(this.url, {
        method: "DELETE",
        redirect: "error",
        credentials: "omit",
        headers: {
          "Mcp-Session-Id": this.session,
          "MCP-Protocol-Version": this.version,
        },
        signal: AbortSignal.timeout(2000),
      })
        .then((r) => r.body?.cancel())
        .catch(() => {});
    }
    this.session = undefined;
  }
}
