/* Camada de dados de grupos, conectada ao backend real (Express + MongoDB).
   Mesmo padrão de data/posts.js: fetch + Bearer token.
   Contrato estável consumido pelas views:
   mantenha as assinaturas das funções exportadas. */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

/* Schema do grupo: { id, name: string, active: boolean } */

let TOKEN = null;

export function setToken(token) {
  TOKEN = token || null;
}

const authHeaders = () => ({
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
});

export async function listGroups() {
  if (!TOKEN) return [];
  const res = await fetch(`${API_BASE}/api/groups`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function createGroup(data) {
  const res = await fetch(`${API_BASE}/api/groups`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error((await res.json()).error || "Erro ao criar grupo");
  }
  return await res.json();
}

export async function updateGroup(id, data) {
  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error((await res.json()).error || "Erro ao editar grupo");
  }
  return await res.json();
}

export async function getRecipientCount(targetGroups) {
  const res = await fetch(`${API_BASE}/api/groups/recipient-count`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ targetGroups }),
  });
  if (!res.ok) {
    throw new Error("Erro ao calcular destinatários");
  }
  return await res.json();
}
