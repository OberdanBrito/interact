/* Camada de dados conectada ao backend real (Express + MongoDB).
   Categorias permanecem estáticas; posts e autenticação vêm da API. */

import { state } from "../core/state.js";
import { cachePosts, getCachedPosts, getCachedPost, removeCachedPost } from "./cache.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

export const CATEGORIES = [
  { id: "todas", label: "Todas" },
  { id: "geral", label: "Geral" },
  { id: "rh", label: "RH" },
  { id: "ti", label: "TI" },
  { id: "beneficios", label: "Benefícios" },
];

// Janela de idade que separa comunicados ativos de arquivados (I-12).
// Deve espelhar ARCHIVE_AFTER_DAYS do backend (mesmo critério nos dois lados).
export const ARCHIVE_AFTER_DAYS = 30;

// Tamanho padrão de página do feed (I-10) — deve respeitar o MAX_LIMIT do backend.
export const FEED_PAGE_SIZE = 20;

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

export async function getPosts(
  groupId,
  { archive, search, category } = {},
  { limit = FEED_PAGE_SIZE, cursor = null } = {}
) {
  if (!TOKEN) return { items: [], nextCursor: null, hasMore: false };
  try {
    const params = [];
    if (groupId && groupId !== "todas") {
      params.push(`groupId=${encodeURIComponent(groupId)}`);
    }
    if (archive === "active" || archive === "archived") {
      params.push(`archive=${archive}`);
    }
    if (search) {
      params.push(`search=${encodeURIComponent(search)}`);
    }
    if (category && category !== "todas") {
      params.push(`category=${encodeURIComponent(category)}`);
    }
    params.push(`limit=${limit}`);
    if (cursor) {
      params.push(`cursor=${encodeURIComponent(cursor)}`);
    }
    const res = await fetch(`${API_BASE}/api/posts?${params.join("&")}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) return { items: [], nextCursor: null, hasMore: false };
    const data = await res.json();
    // Backend sem paginação (array) — trata como página única (retrocompatível).
    if (Array.isArray(data)) {
      return { items: data, nextCursor: null, hasMore: false };
    }
    return {
      items: data.items ?? [],
      nextCursor: data.nextCursor ?? null,
      hasMore: Boolean(data.hasMore),
    };
  } catch {
    // offline ou rede indisponível: cai para o cache do IndexedDB (recorte acumulado)
    const cached = await filterCachedByGroup(groupId, archive, search, category);
    return { items: cached, nextCursor: null, hasMore: false };
  }
}

// Acumula os itens de páginas no CACHE de trabalho (deduplica por id) e os
// persiste no IndexedDB. `reset` substitui o recorte (primeira página / troca de filtro).
export function appendFeedItems(items, { reset = false } = {}) {
  if (reset) CACHE = [];
  for (const item of items || []) {
    const idx = CACHE.findIndex((p) => p.id === item.id);
    if (idx !== -1) CACHE[idx] = item;
    else CACHE.push(item);
  }
  if (items && items.length > 0) cachePosts(items);
  return CACHE;
}

// Regra de visibilidade replicada do backend: admin vê tudo; colaborador
// vê broadcast (targetGroups vazio) + direcionados aos seus grupos.
export function isPostVisibleToUser(post) {
  if (state.user?.role === "admin") return true;
  const targets = post.targetGroups || [];
  if (targets.length === 0) return true;
  return targets.some((g) => (state.user?.groupIds || []).includes(g));
}

async function filterCachedByGroup(groupId, archive, search, category) {
  const cached = await getCachedPosts();
  if (cached.length === 0) return [];
  const cutoff = Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const term = (search || "").trim().toLowerCase();
  const visible = cached.filter((post) => {
    if (!isPostVisibleToUser(post)) return false;
    const targets = post.targetGroups || [];
    if (targets.length === 0) {
      /* broadcast: visível */
    } else if (groupId && groupId !== "todas") {
      if (!targets.includes(groupId)) return false;
    }
    const time = new Date(post.dateISO || 0).getTime();
    if (archive === "active" && time < cutoff) return false;
    if (archive === "archived" && time >= cutoff) return false;
    if (category && category !== "todas" && post.categoryId !== category) return false;
    if (term) {
      const title = String(post.title || "").toLowerCase();
      const author = String(post.author?.name || "").toLowerCase();
      if (!title.includes(term) && !author.includes(term)) return false;
    }
    return true;
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

/* --- Tempo real (I-07): aplica eventos do canal SSE ------------------- */

export function applyRealtimeEvent(name, postData) {
  if (name === "post:new") {
    if (!isPostVisibleToUser(postData)) return CACHE;
    replaceOrPush(postData);
    cachePosts([postData]);
  } else if (name === "post:updated") {
    const idx = CACHE.findIndex((p) => p.id === postData.id);
    if (idx === -1) {
      if (!isPostVisibleToUser(postData)) return CACHE;
      CACHE.unshift(postData);
    } else {
      CACHE[idx] = postData;
    }
    cachePosts([postData]);
  } else if (name === "post:expired") {
    CACHE = CACHE.filter((p) => p.id !== postData.id);
    removeCachedPost(postData.id);
  }
  return CACHE;
}

function replaceOrPush(postData) {
  const idx = CACHE.findIndex((p) => p.id === postData.id);
  if (idx !== -1) {
    CACHE[idx] = postData;
    return;
  }
  CACHE.unshift(postData);
}

// Retorna o recorte da visão atual, não ordenado (feed.js aplica sortFeed/sortByDate).
export function getVisibleCacheFeed() {
  const { activeGroupId, archive, search, filter } = state;
  const cutoff = Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const term = (search || "").trim().toLowerCase();
  return CACHE.filter((post) => {
    if (!isPostVisibleToUser(post)) return false;
    const targets = post.targetGroups || [];
    if (
      targets.length > 0 &&
      activeGroupId !== "todas" &&
      !targets.includes(activeGroupId)
    ) {
      return false;
    }
    const time = new Date(post.dateISO || 0).getTime();
    if (archive === "active" && time < cutoff) return false;
    if (archive === "archived" && time >= cutoff) return false;
    if (term) {
      const title = String(post.title || "").toLowerCase();
      const author = String(post.author?.name || "").toLowerCase();
      if (!title.includes(term) && !author.includes(term)) return false;
    }
    if (filter !== "todas" && post.categoryId !== filter) return false;
    return true;
  });
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

export function getAttachmentUrl(postId, attachmentId) {
  return `${API_BASE}/api/posts/${postId}/attachments/${attachmentId}`;
}
