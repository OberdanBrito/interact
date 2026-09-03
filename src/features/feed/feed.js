import { state } from "../../core/state.js";
import { $, lastGroupKey, storageGet, storageSet } from "../../core/utils.js";
import {
  getCategories,
  getPosts,
  getUserGroups,
  applyRealtimeEvent,
  getVisibleCacheFeed,
  appendFeedItems,
  FEED_PAGE_SIZE,
} from "../../data/posts.js";
import { connect, disconnect, on } from "../../data/events.js";
import { getUserData } from "../auth/session.js";
import { refreshBadge } from "../notifications/badge.js";
import { postCardHTML } from "./templates.js";

const ALL_GROUPS_ID = "todas";

const ARCHIVE_VIEWS = [
  { id: "active", label: "Ativos" },
  { id: "archived", label: "Arquivo" },
];

const SEARCH_DEBOUNCE_MS = 250;

const STATUS_LOADING = "Carregando mais…";
const STATUS_END = "Você chegou ao fim da lista.";

let feedEpoch = 0;
let sentinelObserver = null;

export function resetFilter() {
  state.filter = "todas";
}

export function resetSearch() {
  state.search = "";
  const input = $("#search-input");
  if (input) input.value = "";
}

export function resetActiveGroup() {
  state.activeGroupId = ALL_GROUPS_ID;
  try {
    localStorage.removeItem(lastGroupKey());
  } catch {
    /* armazenamento indisponível */
  }
}

function restoreActiveGroup() {
  const groups = getUserGroups();
  const saved = storageGet(lastGroupKey(), ALL_GROUPS_ID);
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
      storageSet(lastGroupKey(), option.id);
      renderEnvSelector();
      renderFeed();
    });
    container.appendChild(chip);
  }
}

// Busca uma página de comunicados do recorte atual (I-10).
async function fetchPage({ limit = FEED_PAGE_SIZE, cursor = null } = {}) {
  return getPosts(
    state.activeGroupId,
    { archive: state.archive, search: state.search, category: state.filter },
    { limit, cursor }
  );
}

function resetFeedPaging() {
  state.feed.nextCursor = null;
  state.feed.hasMore = false;
  state.feed.loading = false;
  sentinelObserver?.disconnect();
  sentinelObserver = null;
}

function updateFeedStatus() {
  const status = $("#feed-status");
  const sentinel = $("#feed-sentinel");
  const hasCards = $("#post-list").children.length > 0;
  if (state.feed.loading) {
    status.textContent = STATUS_LOADING;
    status.hidden = false;
  } else if (!state.feed.hasMore && hasCards) {
    status.textContent = STATUS_END;
    status.hidden = false;
  } else {
    status.hidden = true;
  }
  if (sentinel) sentinel.hidden = !state.feed.hasMore;
}

function observeFeedSentinel() {
  const sentinel = $("#feed-sentinel");
  if (!sentinel) return;
  if (!state.feed.hasMore) {
    sentinelObserver?.disconnect();
    sentinelObserver = null;
    return;
  }
  if (sentinelObserver) return;
  sentinelObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    },
    { rootMargin: "200px" }
  );
  sentinelObserver.observe(sentinel);
}

function appendPage(items) {
  if (!items || items.length === 0) return;
  const list = $("#post-list");
  const userData = getUserData();
  const html = items
    .filter((post) => !list.querySelector(`[data-post-id="${post.id}"]`))
    .map((post) =>
      postCardHTML(post, {
        liked: userData.likes.includes(post.id),
        read: userData.read.includes(post.id),
      })
    )
    .join("");
  if (html) {
    list.insertAdjacentHTML("beforeend", html);
    refreshBadge();
  }
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

let searchBound = false;

export function bindSearchInput() {
  const input = $("#search-input");
  if (!input || searchBound) return;
  searchBound = true;
  let timer = 0;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.search = input.value.trim();
      renderFeed();
    }, SEARCH_DEBOUNCE_MS);
  });
}

function renderPostList(posts) {
  const list = $("#post-list");
  const empty = $("#empty-state");
  const userData = getUserData();

  if (state.search) {
    $("#empty-title").textContent = "Nenhum comunicado encontrado para a busca";
    $("#empty-sub").textContent = `Não há comunicados para "${state.search}".`;
  } else if (state.archive === "archived") {
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

export async function renderFeed() {
  const epoch = ++feedEpoch;
  resetFeedPaging();
  const page = await fetchPage({ limit: FEED_PAGE_SIZE });
  if (epoch !== feedEpoch) return;
  appendFeedItems(page.items, { reset: true });
  state.feed.nextCursor = page.nextCursor;
  state.feed.hasMore = page.hasMore;
  renderPostList(getVisibleCacheFeed());
  updateFeedStatus();
  observeFeedSentinel();
}

export async function loadMore() {
  if (state.feed.loading || !state.feed.hasMore) return;
  const epoch = feedEpoch;
  state.feed.loading = true;
  updateFeedStatus();
  const page = await fetchPage({
    limit: FEED_PAGE_SIZE,
    cursor: state.feed.nextCursor,
  });
  if (epoch !== feedEpoch) return;
  appendFeedItems(page.items, { reset: false });
  state.feed.nextCursor = page.nextCursor;
  state.feed.hasMore = page.hasMore;
  state.feed.loading = false;
  appendPage(page.items);
  updateFeedStatus();
  observeFeedSentinel();
}

let realtimeBound = false;

export function startRealtime() {
  if (realtimeBound) return;
  realtimeBound = true;
  connect(renderFeed);
  on("post:new", (post) => {
    applyRealtimeEvent("post:new", post);
    renderFeedFromCache();
  });
  on("post:updated", (post) => {
    applyRealtimeEvent("post:updated", post);
    renderFeedFromCache();
  });
  on("post:expired", (data) => {
    applyRealtimeEvent("post:expired", data);
    renderFeedFromCache();
  });
}

export function stopRealtime() {
  disconnect();
  realtimeBound = false;
}

function renderFeedFromCache() {
  renderPostList(getVisibleCacheFeed());
  updateFeedStatus();
}
