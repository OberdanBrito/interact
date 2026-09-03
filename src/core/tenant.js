/* Núcleo de tenant do PWA (MT-26): resolve o tenant a partir do subdomínio e expõe
   a base da API e o slug corrente — usados por storage, cache e camada de dados. */

import { state } from "./state.js";

export function resolveTenant() {
  const hostname = location.hostname || "";
  const parts = hostname.split(".");
  const subdomain =
    parts.length > 2 && !/^\d+$/.test(parts[0]) && parts[0] !== "localhost"
      ? parts[0]
      : "";
  const slug = subdomain || (import.meta.env.VITE_DEFAULT_TENANT_SLUG || "interna");
  // Produção (subdomínio): a API é same-origin (o backend resolve o tenant pelo subdomínio).
  // Dev (sem subdomínio): usa a URL da API de dev (VITE_API_URL || localhost:3002).
  const apiBase = subdomain
    ? window.location.origin
    : import.meta.env.VITE_API_URL || "http://localhost:3002";
  state.tenant = { subdomain, slug, apiBase };
  return state.tenant;
}

export function getTenantSlug() {
  return state.tenant?.slug || "interna";
}

export function getApiBase() {
  return state.tenant?.apiBase || window.location.origin;
}
