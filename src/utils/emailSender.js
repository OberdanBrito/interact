/* Adaptador de envio de e-mail por tenant (I-17).
   Contrato único consumido por rotas/filas: sendEmail({ to, subject, html, tenantId }).
   Implementação atual: SMTP genérico via nodemailer. Provedores tipo "api" ainda não suportados.
   Segredos vêm sempre de Tenant.settings.emailProvider (decifrados em memória), nunca de código/env versionado. */

import nodemailer from "nodemailer";
import Tenant from "../models/Tenant.js";
import { decryptSecret } from "../crypto.js";

/**
 * Cria o transporte SMTP a partir da config do provedor e do segredo já decifrado.
 * Separado de sendEmail para permitir testes isolados do transporte.
 * @param {object} provider config normalizada (Tenant.settings.emailProvider)
 * @param {string} plainSecret segredo decifrado em memória
 * @param {object} [extra] opções extras do nodemailer (uso em testes, ex.: jsonTransport)
 */
export function createTransporter(provider, plainSecret, extra = {}) {
  return nodemailer.createTransport({
    host: provider.host,
    port: provider.port,
    secure: Boolean(provider.secure),
    auth: {
      user: provider.authUser,
      pass: plainSecret,
    },
    ...extra,
  });
}

/**
 * Envia uma mensagem usando uma config de provedor já montada em memória (sem persistir).
 * Usado pelo teste de envio (mode: "send") e internamente por sendEmail.
 * @param {object} provider config normalizada (type/host/port/secure/authUser/fromAddress/fromName)
 * @param {string} plainSecret segredo decifrado
 * @param {{ to: string, subject: string, html: string }} message
 */
export async function sendWithProvider(provider, plainSecret, { to, subject, html }) {
  if (provider.type === "api") {
    throw new Error("Provedor de e-mail tipo api ainda não é suportado para envio");
  }

  const transporter = createTransporter(provider, plainSecret);
  try {
    await transporter.sendMail({
      from: { name: provider.fromName, address: provider.fromAddress },
      to,
      subject,
      html,
    });
    return { sent: true, to };
  } catch (err) {
    // Nunca expõe o segredo (auth.pass) na mensagem de erro/log.
    console.error("Falha no envio de e-mail:", err.message);
    throw new Error("Falha no envio de e-mail via SMTP");
  } finally {
    transporter.close();
  }
}

/**
 * Envia um e-mail pelo provedor configurado do tenant.
 * Sem provedor configurado: dry-run em dev (loga no console) ou erro claro em produção.
 * @param {{ to: string, subject: string, html: string, tenantId: string }} params
 */
export async function sendEmail({ to, subject, html, tenantId }) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new Error("Tenant não encontrado para envio de e-mail");
  }

  const provider = tenant.settings?.emailProvider || null;
  if (!provider) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Provedor de e-mail não configurado para o tenant");
    }
    // Dry-run (dev): registra a mensagem no console, sem envio real.
    console.log(`[dry-run] E-mail para ${to}: "${subject}"\n${html}`);
    return { dryRun: true, to };
  }

  const plainSecret = decryptSecret(provider.secretEncrypted);
  if (!plainSecret) {
    throw new Error("Credencial do provedor de e-mail inválida (não foi possível decifrar)");
  }

  return sendWithProvider(provider, plainSecret, { to, subject, html });
}