/* Camada de dados conectada ao backend real (Express + MongoDB).
   Categorias permanecem estáticas; posts e autenticação vêm da API. */

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

export async function getPosts() {
  if (!TOKEN) return [];
  try {
    const res = await fetch(`${API_BASE}/api/posts`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) return [];
    const posts = await res.json();
    CACHE = posts;
    return posts;
  } catch {
    return []; // offline ou rede indisponível: feed vazio gracioso
  }
}

export function getPostById(id) {
  return CACHE.find((post) => post.id === id) || null;
}

export function getCategories() {
  return CATEGORIES;
}

export function getCategoryLabel(categoryId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.label : categoryId;
}
