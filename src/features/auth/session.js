import { state } from "../../core/state.js";
import { STORAGE_KEYS, storageGet, storageSet, storageRemove } from "../../core/utils.js";
import { login as apiLogin, setToken } from "../../data/posts.js";

export function getCurrentUser() {
  return state.user;
}

export function restoreSession() {
  const session = storageGet(STORAGE_KEYS.session, null);
  if (session && session.email) {
    state.user = session;
    if (session.token) setToken(session.token);
    return true;
  }
  return false;
}

export async function login(email, password) {
  const user = await apiLogin(email, password);
  state.user = user;
  storageSet(STORAGE_KEYS.session, user);
  return user;
}

export function logout() {
  storageRemove(STORAGE_KEYS.session);
  state.user = null;
}
