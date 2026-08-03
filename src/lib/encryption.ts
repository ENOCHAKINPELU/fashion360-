import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// AES-256-GCM at rest for payment gateway secret keys / webhook secrets —
// the only sensitive credentials this platform ever stores (never card data,
// per implementation rule 9). ENCRYPTION_KEY is a long passphrase from env;
// scrypt derives a fixed-length key from it so any secret string works.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT = "fashion360-payment-gateway-credentials";

function getKey(): Buffer {
  const passphrase = process.env.ENCRYPTION_KEY;
  if (!passphrase) throw new Error("ENCRYPTION_KEY is not configured");
  return scryptSync(passphrase, SALT, 32);
}

// Format: iv:authTag:ciphertext, all hex-encoded, so it's a single opaque
// string safe to store in one text column.
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) throw new Error("Malformed encrypted payload");
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

// Never echo a stored secret back to the client — this is what the gateway
// settings UI shows instead so staff can confirm a key is configured.
export function maskSecret(plainText: string): string {
  if (plainText.length <= 8) return "••••••••";
  return `${plainText.slice(0, 4)}••••••••${plainText.slice(-4)}`;
}
