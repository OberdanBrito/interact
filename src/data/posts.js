/* Camada de dados conectada ao backend real (Express + MongoDB).
   Contrato estável consumido pelas views:
   mantenha as assinaturas das funções exportadas. */

import {
  API_BASE,
  getToken,
  setToken as httpSetToken,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from "./http.js";

/* "todas" não é categoria — existe apenas como filtro na listagem. */
export const CATEGORIES = [
  { id: "geral", label: "Geral" },
  { id: "rh", label: "RH" },
  { id: "ti", label: "TI" },
  { id: "beneficios", label: "Benefícios" },
];

export function setToken(token) {
  httpSetToken(token);
}

export async function login(email, password, tenantSlug) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Tenant-Slug": tenantSlug },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error("Credenciais inválidas. Verifique o e-mail e a senha.");
  }
  const data = await res.json();
  return {
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    tenantId: data.user.tenantId,
    token: data.token,
  };
}

export async function listPosts() {
  if (!getToken()) return [];
  const res = await apiGet("/api/posts");
  if (!res.ok) return [];
  const posts = await res.json();
  return [...posts].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
}

export async function getPost(id) {
  if (!getToken()) return null;
  const res = await apiGet(`/api/posts/${id}`);
  return res.ok ? await res.json() : null;
}

export async function createPost(data) {
  const res = await apiPost("/api/posts", data);
  if (!res.ok) {
    throw new Error("Não foi possível publicar o comunicado.");
  }
  return await res.json();
}

export async function updatePost(id, data) {
  const res = await apiPut(`/api/posts/${id}`, data);
  if (!res.ok) {
    throw new Error("Não foi possível salvar as alterações.");
  }
  return await res.json();
}

export async function deletePost(id) {
  const res = await apiDelete(`/api/posts/${id}`);
  return res.ok;
}

// Anexo (I-03): imagem/anexo são enviados via FormData — o Content-Type multipart
// (com boundary) é definido pelo browser; não setar Authorization+JSON manualmente.
export async function uploadAttachment(postId, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await apiPost(`/api/posts/${postId}/attachments`, form);
  const data = res.ok ? await res.json() : null;
  if (!res.ok) {
    throw new Error(data?.error || "Não foi possível anexar o arquivo.");
  }
  return data;
}

export async function deleteAttachment(postId, attachmentId) {
  const res = await apiDelete(
    `/api/posts/${postId}/attachments/${encodeURIComponent(attachmentId)}`
  );
  return res.ok;
}

// Imagem de capa (I-16): upload/remoção dedicados — eixo separado dos anexos.
export async function uploadCoverImage(postId, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await apiPost(`/api/posts/${postId}/cover-image`, form);
  const data = res.ok ? await res.json() : null;
  if (!res.ok) {
    throw new Error(data?.error || "Não foi possível enviar a imagem de capa.");
  }
  return data;
}

export async function deleteCoverImage(postId) {
  const res = await apiDelete(`/api/posts/${postId}/cover-image`);
  return res.ok;
}

export function getCategoryLabel(categoryId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.label : categoryId;
}

export async function getInteractionAggregate(postId) {
  if (!getToken()) return null;
  const res = await apiGet(`/api/interactions?postId=${encodeURIComponent(postId)}`);
  return res.ok ? await res.json() : null;
}

export async function getInteractionsSummary({ desde, ate, groupId } = {}) {
  if (!getToken()) return {};
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (ate) params.set("ate", ate);
  if (groupId) params.set("groupId", groupId);
  const qs = params.toString();
  const res = await apiGet(`/api/interactions/summary${qs ? `?${qs}` : ""}`);
  return res.ok ? await res.json() : {};
}

export async function getInteractionMembers(postId) {
  if (!getToken()) return [];
  const res = await apiGet(
    `/api/interactions/members?postId=${encodeURIComponent(postId)}`
  );
  return res.ok ? await res.json() : [];
}
