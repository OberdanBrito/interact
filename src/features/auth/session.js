import { state } from "../../core/state.js";
import { storageGet, storageSet, storageRemove, sessionKey } from "../../core/utils.js";
import { login as apiLogin } from "../../data/posts.js";
import { setToken, setTenantId } from "../../data/http.js";

// Resolve o tenant a partir do hostname (subdomínio). Sem subdomínio (dev),
// usa o slug default. Define state.tenant = { subdomain, slug }.
export function resolveTenantFromHost() {
  const hostname = location.hostname || "";
  const parts = hostname.split(".");
  const subdomain =
    parts.length > 2 && !/^\d+$/.test(parts[0]) && parts[0] !== "localhost"
      ? parts[0]
      : "";
  const slug = subdomain || (import.meta.env.VITE_DEFAULT_TENANT_SLUG || "interna");
  state.tenant = { subdomain, slug };
  return state.tenant;
}

function currentSlug() {
  return state.tenant?.slug || "interna";
}

export function getCurrentUser() {
  return state.user;
}

export function restoreSession() {
  if (!state.tenant?.slug) return false;
  const slug = currentSlug();
  const session = storageGet(sessionKey(slug), null);
  if (
    session &&
    session.email &&
    session.token &&
    session.tenantId &&
    session.tenantSlug === slug
  ) {
    state.user = session;
    setToken(session.token);
    setTenantId(session.tenantId);
    return true;
  }
  storageRemove(sessionKey(slug));
  return false;
}

export async function login(email, password) {
  const user = await apiLogin(email, password, currentSlug());
  const session = {
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: currentSlug(),
    token: user.token,
  };
  state.user = session;
  storageSet(sessionKey(currentSlug()), session);
  setToken(user.token);
  setTenantId(user.tenantId);
  return user;
}

export function logout() {
  storageRemove(sessionKey(currentSlug()));
  state.user = null;
  setToken(null);
  setTenantId(null);
}
