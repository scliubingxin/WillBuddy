import { McpClient } from "../runtime/mcp.mjs";
export function bearerToken(value) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 4096 ||
    !/^[A-Za-z0-9._~+\/-]+=*$/.test(value)
  )
    throw Error("Bearer Token须为8–4096字符的有效令牌，不含Bearer前缀或空白");
  return value;
}
/** Deliberate projection: never spread ciphertext or future secret fields. */
export function mcpViews(data) {
  return (data.mcpConnections || []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    url: c.url,
    enabled: c.enabled,
    revision: c.revision,
    time: c.time,
    auth: c.auth || "none",
    hasToken: !!c.encryptedToken,
    ...(c.lastTest ? { lastTest: structuredClone(c.lastTest) } : {}),
  }));
}
/** Called only AFTER native approval. No network or decryption at config/list time. */
export function createMcpClientFactory({ store, secrets, fetcher }) {
  return (url, binding) => {
    if (!binding) return new McpClient(url, { fetcher });
    const row = (store.data.mcpConnections || []).find(
      (c) => c.id === binding.id,
    );
    if (
      !row ||
      !row.enabled ||
      row.url !== url ||
      row.revision !== binding.revision
    )
      throw Error("MCP连接配置已变更");
    const revision = row.revision,
      cipher = row.encryptedToken,
      auth = row.auth || "none";
    const validate = () => {
      const c = (store.data.mcpConnections || []).find((c) => c.id === row.id);
      if (
        !c ||
        !c.enabled ||
        c.url !== url ||
        c.revision !== revision ||
        (c.auth || "none") !== auth ||
        c.encryptedToken !== cipher
      )
        throw Error("MCP连接或凭据已变更，请重新发起任务");
    };
    let token;
    if (auth === "bearer") {
      if (!cipher || !secrets) throw Error("MCP凭据不可用，请重新配置");
      token = bearerToken(secrets.open(cipher));
    } else if (auth !== "none") throw Error("不支持的MCP认证方式");
    return new McpClient(url, { fetcher, token, validate });
  };
}
