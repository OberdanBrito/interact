import crypto from "node:crypto";

// Cifragem/decifragem do segredo do provedor de e-mail (MT-27).
// AES-256-GCM com chave de `ENCRYPTION_KEY` (base64 de 32 bytes).
// Formato do ciphertext em repouso: `iv:tag:data` (hex).

const KEY = process.env.ENCRYPTION_KEY;

function getKey() {
  if (!KEY) {
    throw new Error(
      "ENCRYPTION_KEY não definida. Defina ENCRYPTION_KEY no ambiente para cifrar o segredo do provedor de e-mail."
    );
  }
  return Buffer.from(KEY, "base64");
}

/**
 * Cifra um texto e retorna `iv:tag:data` em hex.
 * @param {string} plain
 * @returns {string}
 */
export function encryptSecret(plain) {
  if (plain == null) {
    throw new Error("Valor a cifrar não pode ser nulo");
  }
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

/**
 * Decifra um valor `iv:tag:data` (hex) de volta ao texto.
 * @param {string} value
 * @returns {string|null} texto original ou null se inválido
 */
export function decryptSecret(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(":");
  if (parts.length !== 3) return null;
  const [ivHex, tagHex, dataHex] = parts;
  try {
    const key = getKey();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Gera uma string mascarada a partir do segredo (ex.: `••••1234`).
 * Nunca expõe o texto completo.
 * @param {string|null} plain
 * @returns {string}
 */
export function maskSecret(plain) {
  if (!plain) return "";
  if (plain.length <= 4) return "••••";
  return `••••${plain.slice(-4)}`;
}
