import { getTenantSlug } from "./tenant.js";

// Chaves de storage isoladas por tenant (MT-26): o slug do subdomínio é a identidade
// do tenant na URL (conhecida no bootstrap); o tenantId fica dentro da sessão.
export function sessionKey() {
  return `interact.${getTenantSlug()}.session`;
}
export function userDataKey(email) {
  return `interact.${getTenantSlug()}.user.${email}`;
}
export function syncQueueKey() {
  return `interact.${getTenantSlug()}.syncQueue`;
}
export function lastGroupKey() {
  return `interact.${getTenantSlug()}.lastGroup`;
}
export function dismissInstallKey() {
  return `interact.${getTenantSlug()}.installDismissed`;
}

export const REDUCED_MOTION = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

export const $ = (sel) => document.querySelector(sel);

export function escapeHTML(str) {
  return str
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

export function initialsOf(name) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) || "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}
