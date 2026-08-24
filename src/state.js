export const state = {
  user: null,               // dono: session.js
  userData: null,           // dono: session.js ({ likes: [], read: [] })
  filter: "todas",          // dono: feed.js
  deferredPrompt: null,     // dono: pwa.js
  sheetRestoreFocus: null,  // dono: sheet.js
  sheetPostId: null,        // dono: sheet.js
  sheetDwellTimer: null,    // dono: autoread.js
  sheetEpoch: 0,            // dono: sheet.js
  toastTimer: null,         // dono: toast.js
};
