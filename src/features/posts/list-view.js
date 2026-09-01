import { state, PAGE_SIZE } from "../../core/state.js";
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

function renderPagination(pagination, page, totalPages, root) {
  if (!pagination) return;
  if (totalPages <= 1) {
    pagination.hidden = true;
    return;
  }
  pagination.hidden = false;
  pagination.innerHTML = `
    <span class="pagination-info">Página ${page} de ${totalPages}</span>
    <button type="button" class="btn pagination-prev" ${page <= 1 ? "disabled" : ""}>Anterior</button>
    <button type="button" class="btn pagination-next" ${page >= totalPages ? "disabled" : ""}>Próxima</button>`;
  pagination.querySelector(".pagination-prev")?.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      renderRows(root);
    }
  });
  pagination.querySelector(".pagination-next")?.addEventListener("click", () => {
    if (state.page < totalPages) {
      state.page += 1;
      renderRows(root);
    }
  });
}

async function renderRows(root) {
  const posts = await listPosts();
  const filtered = filterPosts(posts);
  const tbody = root.querySelector("#posts-tbody");
  const empty = root.querySelector("#list-empty");
  const table = root.querySelector("#posts-table");
  const count = root.querySelector("#posts-count");
  const pagination = root.querySelector("#posts-pagination");

  const draftCount = filtered.filter((p) => p.status === "rascunho").length;
  count.textContent =
    draftCount > 0
      ? `${filtered.length} comunicados (${draftCount} rascunho${draftCount > 1 ? "s" : ""})`
      : filtered.length === 1
        ? "1 comunicado"
        : `${filtered.length} comunicados`;

  if (posts.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    empty.innerHTML = emptyStateHTML({
      title: "Nenhum comunicado publicado",
      message: "Os comunicados publicados aqui aparecem no app dos colaboradores.",
      showCta: true,
    });
    if (pagination) pagination.hidden = true;
    return;
  }

  if (filtered.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    empty.innerHTML = emptyStateHTML({
      title: "Nenhum resultado encontrado",
      message: "Ajuste a busca ou o filtro de categoria para ver outros comunicados.",
    });
    if (pagination) pagination.hidden = true;
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;
  const pageItems = filtered.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

  table.hidden = false;
  empty.hidden = true;
  tbody.innerHTML = pageItems.map(postRowHTML).join("");
  renderPagination(pagination, state.page, totalPages, root);
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

/* Fixa/desfixa um comunicado publicado direto da listagem (I-04). */
async function handleTogglePin(postId, pinnedAtual, root) {
  try {
    await updatePost(postId, { pinned: !pinnedAtual });
    showToast(
      pinnedAtual ? "Comunicado desfixado com sucesso" : "Comunicado fixado com sucesso"
    );
  } catch {
    showToast("Não foi possível alternar a fixação do comunicado.");
  }
  renderRows(root);
}

async function openPublishOrDelete(event, root) {
  const publishBtn = event.target.closest(".js-publish");
  if (publishBtn) {
    return handlePublish(publishBtn.dataset.postId, root);
  }
  const pinBtn = event.target.closest(".js-pin");
  if (pinBtn) {
    return handleTogglePin(
      pinBtn.dataset.postId,
      pinBtn.classList.contains("is-active"),
      root
    );
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
      <nav id="posts-pagination" aria-label="Paginação de comunicados"></nav>
    </div>`;

  const search = root.querySelector("#search");
  const filter = root.querySelector("#category-filter");
  search.value = state.search;
  filter.value = state.categoryFilter;

  search.addEventListener("input", () => {
    state.search = search.value;
    state.page = 1;
    renderRows(root);
  });
  filter.addEventListener("change", () => {
    state.categoryFilter = filter.value;
    state.page = 1;
    renderRows(root);
  });

  root.querySelector("#posts-tbody").addEventListener("click", (event) => {
    openPublishOrDelete(event, root);
  });

  renderRows(root);
}
