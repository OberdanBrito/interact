import { state } from "../../core/state.js";
import { STORAGE_KEYS, storageGet, storageSet } from "../../core/utils.js";
import { login as apiLogin, setToken } from "../../data/posts.js";

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
  return user;
}

export function logout() {
  try {
    localStorage.removeItem(STORAGE_KEYS.session);
  } catch {
    /* armazenamento indisponível */
  }
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
  return nowLiked;
}

export function markReadPersist(postId) {
  const wasUnread = !state.userData.read.includes(postId);
  if (wasUnread) {
    state.userData.read.push(postId);
    storageSet(STORAGE_KEYS.userPrefix + state.user.email, state.userData);
  }
  return wasUnread;
}
