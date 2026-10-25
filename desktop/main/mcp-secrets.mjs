/** Host-only adapter: preserve the existing app/OS encryption identity.
 * No fallback to plaintext or basic_text; ciphertext stays out of renderer state.
 */
export function createMcpSecretCodec(safeStorage) {
  const available = () =>
    safeStorage.isEncryptionAvailable() &&
    safeStorage.getSelectedStorageBackend?.() !== "basic_text";
  return {
    seal(token) {
      if (!available()) throw Error("系统安全存储不可用，不能保存MCP凭据");
      try {
        return safeStorage.encryptString(token).toString("base64");
      } catch {
        throw Error("MCP凭据加密失败，未保存");
      }
    },
    open(ciphertext) {
      if (!available()) throw Error("系统安全存储不可用，不能读取MCP凭据");
      try {
        return safeStorage.decryptString(Buffer.from(ciphertext, "base64"));
      } catch {
        throw Error("MCP凭据无法解密，请重新配置");
      }
    },
  };
}
