import { state } from "../../core/state.js";
import { STORAGE_KEYS, storageGet, storageSet } from "../../core/utils.js";
import { login as apiLogin, setToken, fetchMyInteractions } from "../../data/posts.js";
import { enqueue, syncNow } from "../../data/sync.js";
import { clearCache } from "../../data/cache.js";
import { refreshBadge, clearBadge } from "../notifications/badge.js";

export function getCurrentUser() {
  return state.user;
}

export function getUserData() {
  return state.userData;
}

function loadUserData(email) {
  state.userData = storageGet(STORAGE_KEYS.userPrefix + email, {
    likes: [],
    read: [],
  });
}

export function restoreSession() {
  const session = storageGet(STORAGE_KEYS.session, null);
  if (session && session.email) {
    state.user = session;
    if (session.token) setToken(session.token);
    loadUserData(session.email);
    return true;
  }
  return false;
}

export async function login(email, password) {
  const user = await apiLogin(email, password);
  state.user = user;
  loadUserData(user.email);
  storageSet(STORAGE_KEYS.session, user);
  await restoreInteractions();
  return user;
}

// Mescla o estado do servidor com o localStorage (união de likes/leituras).
export async function restoreInteractions() {
  if (!state.user) return;
  const server = await fetchMyInteractions();
  if (!server) return;
  const serverLikes = [];
  const serverRead = [];
  for (const [postId, st] of Object.entries(server)) {
    if (st.liked) serverLikes.push(postId);
    if (st.read) serverRead.push(postId);
  }
  state.userData.likes = Array.from(
    new Set([...state.userData.likes, ...serverLikes])
  );
  state.userData.read = Array.from(
    new Set([...state.userData.read, ...serverRead])
  );
  storageSet(STORAGE_KEYS.userPrefix + state.user.email, state.userData);
}

export function logout() {
  try {
    localStorage.removeItem(STORAGE_KEYS.session);
  } catch {
    /* armazenamento indisponível */
  }
  clearCache(); // não vazar posts cacheados entre usuários
  clearBadge();
  state.user = null;
  state.userData = { likes: [], read: [] };
}

export function isRead(postId) {
  return state.userData.read.includes(postId);
}

export function toggleLikePersist(postId) {
  const likedIndex = state.userData.likes.indexOf(postId);
  const nowLiked = likedIndex === -1;
  if (nowLiked) state.userData.likes.push(postId);
  else state.userData.likes.splice(likedIndex, 1);
  storageSet(STORAGE_KEYS.userPrefix + state.user.email, state.userData);
  enqueue(postId, { liked: nowLiked });
  syncNow();
  return nowLiked;
}

export function markReadPersist(postId) {
  const wasUnread = !state.userData.read.includes(postId);
  if (wasUnread) {
    state.userData.read.push(postId);
    storageSet(STORAGE_KEYS.userPrefix + state.user.email, state.userData);
    enqueue(postId, { read: true });
    syncNow();
    refreshBadge();
  }
  return wasUnread;
}

export function markUnreadPersist(postId) {
  const index = state.userData.read.indexOf(postId);
  if (index === -1) return false;
  state.userData.read.splice(index, 1);
  storageSet(STORAGE_KEYS.userPrefix + state.user.email, state.userData);
  enqueue(postId, { read: false });
  syncNow();
  refreshBadge();
  return true;
}
