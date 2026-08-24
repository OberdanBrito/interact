export const STORAGE_KEYS = {
  session: "interact-admin/session",
  posts: "interact-admin/posts",
};

export const $ = (sel) => document.querySelector(sel);

export function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível — app segue em memória */
  }
}

export function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* armazenamento indisponível */
  }
}

export function relativeDate(iso) {
  const diffDays = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 86400000
  );
  if (diffDays <= 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;
  const date = new Date(iso);
  const formatted = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  return formatted.replace(".", "");
}

export function fullDate(iso) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function initialsOf(name) {
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.charAt(0) || "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

/* Busca insensível a caso e acentos. */
export function normalizeText(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function uid(prefix = "p") {
  return `${prefix}${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
