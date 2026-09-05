import { maskSecret } from "../crypto.js";

export const EMAIL_PROVIDER_TYPES = ["smtp", "api"];

export function normalizeEmailProvider(input = {}) {
  const type = input.type;
  if (!EMAIL_PROVIDER_TYPES.includes(type)) {
    return { error: "type deve ser smtp ou api" };
  }
  if (!input.host || typeof input.host !== "string" || !input.host.trim()) {
    return { error: "host é obrigatório" };
  }
  const port = Number(input.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { error: "port deve ser um número entre 1 e 65535" };
  }
  if (!input.fromAddress || typeof input.fromAddress !== "string" || !input.fromAddress.trim()) {
    return { error: "fromAddress é obrigatório" };
  }
  if (!input.fromName || typeof input.fromName !== "string" || !input.fromName.trim()) {
    return { error: "fromName é obrigatório" };
  }
  if (!input.authUser || typeof input.authUser !== "string" || !input.authUser.trim()) {
    return { error: "authUser é obrigatório" };
  }
  return {
    value: {
      type,
      host: input.host.trim(),
      port,
      secure: !!input.secure,
      authUser: input.authUser.trim(),
      fromAddress: input.fromAddress.trim(),
      fromName: input.fromName.trim(),
    },
  };
}

/**
 * Serializa a config para a resposta pública.
 * - Recebe o segredo JÁ decifrado em memória (ou null) apenas para calcular a máscara.
 * - Nunca devolve o segredo em texto claro nem o ciphertext (secretEncrypted).
 * @param {object} config config armazenada (Tenant.settings.emailProvider)
 * @param {string|null} plainSecret segredo decifrado em memória (ou null se não há)
 */
export function toPublicProvider(config, plainSecret) {
  if (!config) return null;
  return {
    type: config.type,
    host: config.host,
    port: config.port,
    secure: config.secure,
    authUser: config.authUser,
    fromAddress: config.fromAddress,
    fromName: config.fromName,
    maskedSecret: config.secretEncrypted ? maskSecret(plainSecret) : "",
    updatedBy: config.updatedBy ?? null,
    updatedAt: config.updatedAt ?? null,
    configured: Boolean(config.secretEncrypted),
  };
}
