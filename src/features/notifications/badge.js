import { state } from "../../core/state.js";
import { getCachedPosts } from "../../data/cache.js";
import { isPostVisibleToUser } from "../../data/posts.js";

// Badge de não-lidos no ícone do app instalado (Badging API).
// É um "push visual" 100% client-side: só funciona em PWA instalado
// (Chromium); em qualquer outro contexto é no-op gracioso.
export async function refreshBadge() {
  if (!("setAppBadge" in navigator)) return;
  try {
    const posts = await getCachedPosts();
    const unread = posts.filter(
      (post) => isPostVisibleToUser(post) && !state.userData.read.includes(post.id)
    ).length;
    if (unread > 0) await navigator.setAppBadge(unread);
    else await navigator.clearAppBadge();
  } catch {
    /* Badging API indisponível ou bloqueada — segue sem badge */
  }
}

export async function clearBadge() {
  if (!("clearAppBadge" in navigator)) return;
  try {
    await navigator.clearAppBadge();
  } catch {
    /* no-op */
  }
}