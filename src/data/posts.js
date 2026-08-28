/* Camada de dados conectada ao backend real (Express + MongoDB).
   Categorias permanecem estáticas; posts e autenticação vêm da API. */

import { state } from "../core/state.js";
import { cachePosts, getCachedPosts, getCachedPost } from "./cache.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

export const CATEGORIES = [
  { id: "todas", label: "Todas" },
  { id: "geral", label: "Geral" },
  { id: "rh", label: "RH" },
  { id: "ti", label: "TI" },
  { id: "beneficios", label: "Benefícios" },
];

let TOKEN = null;
let CACHE = [];

/* Restaura o token (ex.: sessão recuperada do localStorage no reload). */
export function setToken(token) {
  TOKEN = token || null;
}

export function getToken() {
  return TOKEN;
}

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
  return {
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    token: data.token,
    groupIds: data.user.groupIds || [],
    groups: data.user.groups || [],
  };
}

export async function getPosts(groupId) {
  if (!TOKEN) return [];
  try {
    const url =
      groupId && groupId !== "todas"
        ? `${API_BASE}/api/posts?groupId=${encodeURIComponent(groupId)}`
        : `${API_BASE}/api/posts`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) return [];
    const posts = await res.json();
    CACHE = posts;
    cachePosts(posts); // persiste no IndexedDB para leitura offline
    return posts;
  } catch {
    // offline ou rede indisponível: cai para o cache do IndexedDB
    return filterCachedByGroup(groupId);
  }
}

// Filtra os posts cacheados replicando a regra de visibilidade do backend:
// broadcast (targetGroups vazio) sempre visível; direcionado só se incluir
// um dos grupos do usuário (ou o grupo específico solicitado).
async function filterCachedByGroup(groupId) {
  const cached = await getCachedPosts();
  if (cached.length === 0) return [];
  if (state.user?.role === "admin") {
    CACHE = cached;
    return cached;
  }
  const myGroupIds = state.user?.groupIds || [];
  const visible = cached.filter((post) => {
    const targets = post.targetGroups || [];
    if (targets.length === 0) return true; // broadcast
    if (groupId && groupId !== "todas") return targets.includes(groupId);
    return targets.some((g) => myGroupIds.includes(g));
  });
  CACHE = visible;
  return visible;
}

export function getUserGroups() {
  return state.user?.groups || [];
}

export function getPostById(id) {
  return CACHE.find((post) => post.id === id) || null;
}

// Versão assíncrona: consulta a memória e, se não achar, cai para o
// IndexedDB (ex.: bottom sheet aberto offline após reload).
export async function getPostByIdAsync(id) {
  const inMemory = getPostById(id);
  if (inMemory) return inMemory;
  return getCachedPost(id);
}

export function getCategories() {
  return CATEGORIES;
}

export function getCategoryLabel(categoryId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.label : categoryId;
}

/* --- Interações (bidirecional) ---------------------------------------- */

// Envia o estado do usuário para um comunicado ao backend.
// Retorna true em sucesso; false em falha de rede/API (fica na fila offline).
export async function syncInteraction(postId, { liked, read } = {}) {
  if (!TOKEN) return false;
  try {
    const res = await fetch(`${API_BASE}/api/interactions/${postId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ liked, read }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Busca o estado consolidado do usuário (likes/leituras) em todos os posts.
// Usado para restaurar o estado num novo dispositivo.
export async function fetchMyInteractions() {
  if (!TOKEN) return {};
  try {
    const res = await fetch(`${API_BASE}/api/interactions/me`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
}
