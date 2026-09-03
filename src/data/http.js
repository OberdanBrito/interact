/* Camada HTTP central do admin (MT-25): única fonte de API_BASE, token e tenantId.
   Os módulos de dados (posts.js, groups.js) usam os helpers aqui — a identidade do
   tenant é injetada em toda requisição autenticada via X-Tenant-Id. */

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

let TOKEN = null;
let TENANT_ID = null;

export function getToken() {
  return TOKEN;
}

export function setToken(token) {
  TOKEN = token || null;
}

export function getTenantId() {
  return TENANT_ID;
}

export function setTenantId(id) {
  TENANT_ID = id || null;
}

/* Headers de requisições autenticadas: Authorization + Content-Type + X-Tenant-Id. */
export function authHeaders() {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };
  if (TENANT_ID) headers["X-Tenant-Id"] = TENANT_ID;
  return headers;
}

async function request(method, path, { body, headers = {} } = {}) {
  const opts = { method, headers: { ...authHeaders(), ...headers } };
  if (body instanceof FormData) {
    // multipart: o browser define o boundary — não setar Content-Type manualmente
    delete opts.headers["Content-Type"];
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  return fetch(`${API_BASE}${path}`, opts);
}

export function apiGet(path, extra) {
  return request("GET", path, extra);
}

export function apiPost(path, body, extra) {
  return request("POST", path, { ...extra, body });
}

export function apiPut(path, body, extra) {
  return request("PUT", path, { ...extra, body });
}

export function apiDelete(path, extra) {
  return request("DELETE", path, extra);
}
