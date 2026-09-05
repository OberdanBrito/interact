/* Camada de dados do provedor de e-mail do tenant (MT-28).
   Consome a API do backend (MT-27) via camada HTTP central (http.js).
   Contrato estável consumido pela view: mantenha as assinaturas exportadas. */

import { apiGet, apiPost, apiPut } from "./http.js";

export async function getEmailProvider() {
  const res = await apiGet("/api/tenant/settings/email-provider");
  if (!res.ok) return { provider: null };
  return await res.json();
}

export async function updateEmailProvider(payload) {
  const res = await apiPut("/api/tenant/settings/email-provider", payload);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Erro ao salvar o provedor de e-mail");
  }
  return data;
}

export async function testEmailProvider(payload) {
  const res = await apiPost("/api/tenant/settings/email-provider/test", payload);
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error || "Falha na conexão" };
  }
  return { ok: true, detail: data.detail || "" };
}
