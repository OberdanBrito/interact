import { state } from "../../core/state.js";
import { $, STORAGE_KEYS, storageGet, storageSet } from "../../core/utils.js";
import { getCategories, getPosts, getUserGroups } from "../../data/posts.js";
import { getUserData } from "../auth/session.js";
import { refreshBadge } from "../notifications/badge.js";
import { postCardHTML } from "./templates.js";

const ALL_GROUPS_ID = "todas";

export function resetFilter() {
  state.filter = "todas";
}

export function resetActiveGroup() {
  state.activeGroupId = ALL_GROUPS_ID;
  try {
    localStorage.removeItem(STORAGE_KEYS.lastGroup);
  } catch {
    /* armazenamento indisponível */
  }
}

function restoreActiveGroup() {
  const groups = getUserGroups();
  const saved = storageGet(STORAGE_KEYS.lastGroup, ALL_GROUPS_ID);
  state.activeGroupId =
    saved !== ALL_GROUPS_ID && groups.some((group) => group.id === saved)
      ? saved
      : ALL_GROUPS_ID;
}

export function renderEnvSelector() {
  const container = $("#env-selector");
  const groups = getUserGroups();
  restoreActiveGroup();

  if (groups.length === 0) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.innerHTML = "";
  const options = [{ id: ALL_GROUPS_ID, name: "Todas" }, ...groups];
  for (const option of options) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = option.name;
    chip.dataset.groupId = option.id;
    chip.setAttribute(
      "aria-pressed",
      String(state.activeGroupId === option.id)
    );
    chip.addEventListener("click", () => {
      if (state.activeGroupId === option.id) return;
      state.activeGroupId = option.id;
      storageSet(STORAGE_KEYS.lastGroup, option.id);
      renderEnvSelector();
      renderFeed();
    });
    container.appendChild(chip);
  }
}

// Ordenação inteligente: urgentes primeiro, depois não-lidos, depois mais recentes.
function sortFeed(posts) {
  const userData = getUserData();
  return [...posts].sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    const aUnread = !userData.read.includes(a.id);
    const bUnread = !userData.read.includes(b.id);
    if (aUnread !== bUnread) return aUnread ? -1 : 1;
    const aTime = new Date(a.dateISO || 0).getTime();
    const bTime = new Date(b.dateISO || 0).getTime();
    return bTime - aTime;
  });
}

async function visiblePosts() {
  const posts = await getPosts(state.activeGroupId);
  const filtered =
    state.filter === "todas" ? posts : posts.filter((post) => post.categoryId === state.filter);
  return sortFeed(filtered);
}

export function renderChips() {
  const container = $("#chips");
  container.innerHTML = "";
  for (const cat of getCategories()) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = cat.label;
    chip.dataset.catId = cat.id;
    chip.setAttribute("aria-pressed", String(state.filter === cat.id));
    chip.addEventListener("click", () => {
      state.filter = cat.id;
      renderChips();
      renderFeed();
    });
    container.appendChild(chip);
  }
}

export async function renderFeed() {
  const list = $("#post-list");
  const empty = $("#empty-state");
  const userData = getUserData();
  const posts = await visiblePosts();

  empty.hidden = posts.length > 0;
  list.innerHTML = posts
    .map((post) =>
      postCardHTML(post, {
        liked: userData.likes.includes(post.id),
        read: userData.read.includes(post.id),
      })
    )
    .join("");

  refreshBadge();
}
