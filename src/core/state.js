export const state = {
  user: null,               // dono: session.js
  userData: null,           // dono: session.js ({ likes: [], read: [] })
  tenant: null,             // dono: tenant.js — { subdomain, slug, apiBase } (MT-26)
  filter: "todas",          // dono: feed.js
  search: "",               // dono: feed.js (termo de busca por título/autor; I-09)
  activeGroupId: "todas",   // dono: feed.js (ambiente: "todas" ou id de grupo)
  archive: "active",        // dono: feed.js (visão do feed: "active" | "archived")
  feed: {                   // dono: feed.js (paginação por cursor; I-10)
    nextCursor: null,
    hasMore: false,
    loading: false,
  },
  deferredPrompt: null,     // dono: pwa.js
  sheetRestoreFocus: null,  // dono: sheet.js
  sheetPostId: null,        // dono: sheet.js
  sheetDwellTimer: null,    // dono: autoread.js
  sheetEpoch: 0,            // dono: sheet.js
  toastTimer: null,         // dono: toast.js
};
