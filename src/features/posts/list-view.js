import { state } from "../../core/state.js";
import { CATEGORIES, listPosts, getPost, deletePost, updatePost } from "../../data/posts.js";
import { postRowHTML, emptyStateHTML, confirmModalHTML } from "../../ui/templates.js";
import { $, normalizeText } from "../../core/utils.js";
import { showToast } from "../../ui/toast.js";

function filterPosts(posts) {
  const term = normalizeText(state.search.trim());
  return posts.filter((post) => {
    const matchCategory =
      state.categoryFilter === "todas" || post.categoryId === state.categoryFilter;
    const matchSearch = !term || normalizeText(post.title).includes(term);
    return matchCategory && matchSearch;
  });
}

async function renderRows(root) {
  const posts = await listPosts();
  const filtered = filterPosts(posts);
  const tbody = root.querySelector("#posts-tbody");
  const empty = root.querySelector("#list-empty");
  const table = root.querySelector("#posts-table");
  const count = root.querySelector("#posts-count");

  const draftCount = posts.filter((p) => p.status === "rascunho").length;
  count.textContent =
    draftCount > 0
      ? `${posts.length} comunicados (${draftCount} rascunho${draftCount > 1 ? "s" : ""})`
      : posts.length === 1
        ? "1 comunicado"
        : `${posts.length} comunicados`;

  if (posts.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    empty.innerHTML = emptyStateHTML({
      title: "Nenhum comunicado publicado",
      message: "Os comunicados publicados aqui aparecem no app dos colaboradores.",
      showCta: true,
    });
    return;
  }

  if (filtered.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    empty.innerHTML = emptyStateHTML({
      title: "Nenhum resultado encontrado",
      message: "Ajuste a busca ou o filtro de categoria para ver outros comunicados.",
    });
    return;
  }

  table.hidden = false;
  empty.hidden = true;
  tbody.innerHTML = filtered.map(postRowHTML).join("");
}

function closeModal() {
  const modalRoot = $("#modal-root");
  modalRoot.innerHTML = "";
  if (state.modalKeyHandler) {
    document.removeEventListener("keydown", state.modalKeyHandler);
    state.modalKeyHandler = null;
  }
}

function openConfirmModal(post, root) {
  const modalRoot = $("#modal-root");
  modalRoot.innerHTML = confirmModalHTML({ postTitle: post.title });

  const overlay = modalRoot.querySelector(".js-modal-overlay");
  const cancel = modalRoot.querySelector(".js-modal-cancel");
  const confirm = modalRoot.querySelector(".js-modal-confirm");

  state.modalKeyHandler = (event) => {
    if (event.key === "Escape") closeModal();
  };
  document.addEventListener("keydown", state.modalKeyHandler);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });
  cancel.addEventListener("click", closeModal);
  confirm.addEventListener("click", async () => {
    await deletePost(post.id);
    closeModal();
    showToast("Comunicado excluído com sucesso");
    renderRows(root);
  });

  cancel.focus();
}

/* Publica um rascunho direto da lista (I-02). Sem modal — escopo enxuto. */
async function handlePublish(postId, root) {
  try {
    await updatePost(postId, { status: "published" });
    showToast("Rascunho publicado com sucesso");
  } catch {
    showToast(
      "Não foi possível publicar. Edite o rascunho para completar os campos obrigatórios."
    );
  }
  renderRows(root);
}

async function openPublishOrDelete(event, root) {
  const publishBtn = event.target.closest(".js-publish");
  if (publishBtn) {
    return handlePublish(publishBtn.dataset.postId, root);
  }
  const btn = event.target.closest(".js-delete");
  if (btn) {
    const post = await getPost(btn.dataset.postId);
    if (post) openConfirmModal(post, root);
  }
}

export function render(root) {
  root.innerHTML = `
    <div class="page-head">
      <p class="page-subtitle" id="posts-count" aria-live="polite"></p>
    </div>

    <div class="toolbar">
      <div class="search-field">
        <svg width="18" height="18" aria-hidden="true" focusable="false"><use href="#i-search"/></svg>
        <input class="input" id="search" type="search" placeholder="Buscar por título…"
               autocomplete="off" aria-label="Buscar comunicado por título">
      </div>
      <select class="input select" id="category-filter" aria-label="Filtrar por categoria">
        <option value="todas">Todas as categorias</option>
        ${CATEGORIES.map(
          (cat) => `<option value="${cat.id}">${cat.label}</option>`
        ).join("")}
      </select>
    </div>

    <div class="card table-wrap">
      <table id="posts-table">
        <thead>
          <tr>
            <th scope="col">Título</th>
            <th scope="col">Categoria</th>
            <th scope="col">Leitura</th>
            <th scope="col">Data</th>
            <th scope="col">Autor</th>
            <th scope="col"><span class="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody id="posts-tbody"></tbody>
      </table>
      <div id="list-empty" hidden></div>
    </div>`;

  const search = root.querySelector("#search");
  const filter = root.querySelector("#category-filter");
  search.value = state.search;
  filter.value = state.categoryFilter;

  search.addEventListener("input", () => {
    state.search = search.value;
    renderRows(root);
  });
  filter.addEventListener("change", () => {
    state.categoryFilter = filter.value;
    renderRows(root);
  });

  root.querySelector("#posts-tbody").addEventListener("click", (event) => {
    openPublishOrDelete(event, root);
  });

  renderRows(root);
}
