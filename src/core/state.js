export const PAGE_SIZE = 20;

export const state = {
  user: null,              // dono: session.js
  toastTimer: null,        // dono: toast.js
  search: "",              // dono: views/posts-list.js
  categoryFilter: "todas", // dono: views/posts-list.js
  page: 1,                 // dono: views/posts-list.js (paginação client-side; I-10)
  modalKeyHandler: null,   // dono: views/posts-list.js (handler Esc do modal ativo)
};
