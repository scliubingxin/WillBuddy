import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createMcpSecretCodec } from "../../main/mcp-secrets.mjs";
// Genuine AES-GCM bytes for disk tests, not an OS Keychain acceptance claim.
export function fixtureSecrets() {
  const key = randomBytes(32);
  let opened = 0;
  const safe = {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => "fixture",
    encryptString: (token) => {
      const iv = randomBytes(12),
        c = createCipheriv("aes-256-gcm", key, iv);
      return Buffer.concat([iv, c.update(token), c.final(), c.getAuthTag()]);
    },
    decryptString: (bytes) => {
      opened++;
      const c = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
      c.setAuthTag(bytes.subarray(-16));
      return Buffer.concat([
        c.update(bytes.subarray(12, -16)),
        c.final(),
      ]).toString();
    },
  };
  return { codec: createMcpSecretCodec(safe), opens: () => opened };
}
