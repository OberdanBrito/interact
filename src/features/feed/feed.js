import { state } from "../../core/state.js";
import { $, STORAGE_KEYS, storageGet, storageSet } from "../../core/utils.js";
import { getCategories, getPosts, getUserGroups } from "../../data/posts.js";
import { getUserData } from "../auth/session.js";
import { refreshBadge } from "../notifications/badge.js";
import { postCardHTML } from "./templates.js";

const ALL_GROUPS_ID = "todas";

const ARCHIVE_VIEWS = [
  { id: "active", label: "Ativos" },
  { id: "archived", label: "Arquivo" },
];

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

// Aba "Ativos | Arquivo" (I-12): alterna entre comunicados recentes e antigos.
export function renderArchiveTabs() {
  const container = $("#archive-tabs");
  container.innerHTML = "";
  for (const view of ARCHIVE_VIEWS) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "chip";
    tab.textContent = view.label;
    tab.dataset.archive = view.id;
    tab.setAttribute("aria-pressed", String(state.archive === view.id));
    tab.addEventListener("click", () => {
      if (state.archive === view.id) return;
      state.archive = view.id;
      renderArchiveTabs();
      renderFeed();
    });
    container.appendChild(tab);
  }
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

// Ordenação inteligente: fixados primeiro (I-04), depois urgentes, depois não-lidos, depois mais recentes.
function sortFeed(posts) {
  const userData = getUserData();
  return [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    const aUnread = !userData.read.includes(a.id);
    const bUnread = !userData.read.includes(b.id);
    if (aUnread !== bUnread) return aUnread ? -1 : 1;
    const aTime = new Date(a.dateISO || 0).getTime();
    const bTime = new Date(b.dateISO || 0).getTime();
    return bTime - aTime;
  });
}

// Ordenação da visão "Arquivo": antigos por data (mais recente do grupo primeiro).
function sortByDate(posts) {
  return [...posts].sort((a, b) => {
    const aTime = new Date(a.dateISO || 0).getTime();
    const bTime = new Date(b.dateISO || 0).getTime();
    return bTime - aTime;
  });
}

async function visiblePosts() {
  const posts = await getPosts(state.activeGroupId, { archive: state.archive });
  const filtered =
    state.filter === "todas" ? posts : posts.filter((post) => post.categoryId === state.filter);
  return state.archive === "archived" ? sortByDate(filtered) : sortFeed(filtered);
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

  if (state.archive === "archived") {
    $("#empty-title").textContent = "Nenhum comunicado arquivado";
    $("#empty-sub").textContent =
      "Os comunicados publicados há mais de 30 dias aparecem aqui.";
  } else {
    $("#empty-title").textContent = "Nenhum comunicado por aqui";
    $("#empty-sub").textContent = "Não há publicações nesta categoria ainda.";
  }

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
