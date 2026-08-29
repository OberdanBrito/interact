/* Camada de dados conectada ao backend real (Express + MongoDB).
   Contrato estável consumido pelas views:
   mantenha as assinaturas das funções exportadas. */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

/* "todas" não é categoria — existe apenas como filtro na listagem. */
export const CATEGORIES = [
  { id: "geral", label: "Geral" },
  { id: "rh", label: "RH" },
  { id: "ti", label: "TI" },
  { id: "beneficios", label: "Benefícios" },
];

/* Schema do comunicado (mesmo consumido pela PWA irmã):
   { id, readMode: "auto" | "ack", categoryId, urgent: boolean,
     likeBase: number, title: string, body: string[],
     author: { name, role }, dateISO } */
/* Campos de agendamento (I-01):
   publishAt: ISO | null (futuro = agendado), published: boolean,
   status: "publicado" | "agendado" */
/* Campos de rascunho (I-02):
   status: "rascunho" — salvo sem publicar, editável com campos incompletos.
   createPost/updatePost repassam `status` no payload conforme a ação. */

let TOKEN = null;

export function setToken(token) {
  TOKEN = token || null;
}

const authHeaders = () => ({
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
});

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error("Credenciais inválidas. Verifique o e-mail e a senha.");
  }
  const data = await res.json();
  TOKEN = data.token;
  return { email: data.user.email, name: data.user.name, token: data.token };
}

export async function listPosts() {
  if (!TOKEN) return [];
  const res = await fetch(`${API_BASE}/api/posts`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return [];
  const posts = await res.json();
  return [...posts].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
}

export async function getPost(id) {
  if (!TOKEN) return null;
  const res = await fetch(`${API_BASE}/api/posts/${id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.ok ? await res.json() : null;
}

export async function createPost(data) {
  const res = await fetch(`${API_BASE}/api/posts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Não foi possível publicar o comunicado.");
  }
  return await res.json();
}

export async function updatePost(id, data) {
  const res = await fetch(`${API_BASE}/api/posts/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Não foi possível salvar as alterações.");
  }
  return await res.json();
}

export async function deletePost(id) {
  const res = await fetch(`${API_BASE}/api/posts/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.ok;
}

export function getCategoryLabel(categoryId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.label : categoryId;
}

export async function getInteractionAggregate(postId) {
  if (!TOKEN) return null;
  const res = await fetch(
    `${API_BASE}/api/interactions?postId=${encodeURIComponent(postId)}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  return res.ok ? await res.json() : null;
}

export async function getInteractionsSummary() {
  if (!TOKEN) return {};
  const res = await fetch(`${API_BASE}/api/interactions/summary`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.ok ? await res.json() : {};
}

export async function getInteractionMembers(postId) {
  if (!TOKEN) return [];
  const res = await fetch(
    `${API_BASE}/api/interactions/members?postId=${encodeURIComponent(postId)}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  return res.ok ? await res.json() : [];
}
