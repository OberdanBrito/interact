/* Camada de dados de grupos, conectada ao backend real (Express + MongoDB).
   Usa a camada HTTP central (http.js) — mesmo padrão de data/posts.js.
   Contrato estável consumido pelas views:
   mantenha as assinaturas das funções exportadas. */

import { getToken, setToken as httpSetToken, apiGet, apiPost, apiPut } from "./http.js";

/* Schema do grupo: { id, name: string, active: boolean } */

export function setToken(token) {
  httpSetToken(token);
}

export async function listGroups() {
  if (!getToken()) return [];
  const res = await apiGet("/api/groups");
  if (!res.ok) return [];
  return await res.json();
}

export async function createGroup(data) {
  const res = await apiPost("/api/groups", data);
  if (!res.ok) {
    throw new Error((await res.json()).error || "Erro ao criar grupo");
  }
  return await res.json();
}

export async function updateGroup(id, data) {
  const res = await apiPut(`/api/groups/${id}`, data);
  if (!res.ok) {
    throw new Error((await res.json()).error || "Erro ao editar grupo");
  }
  return await res.json();
}

export async function getRecipientCount(targetGroups) {
  const res = await apiPost("/api/groups/recipient-count", { targetGroups });
  if (!res.ok) {
    throw new Error("Erro ao calcular destinatários");
  }
  return await res.json();
}
