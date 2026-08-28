import { listPosts, getInteractionsSummary, getCategoryLabel } from "../../data/posts.js";
import { escapeHTML, relativeDate } from "../../core/utils.js";
import { emptyStateHTML } from "../../ui/templates.js";

function metricCellHTML(label, value) {
  return `<span class="metric-stat"><strong>${value}</strong> ${label}</span>`;
}

function rowHTML(post, metrics) {
  const reads = metrics?.reads ?? 0;
  const likes = metrics?.likes ?? 0;
  return `
    <tr>
      <td class="cell-post">
        <div class="cell-title">
          <a class="cell-title-link" href="#/analytics/${escapeHTML(post.id)}">
            <span class="cell-title-text">${escapeHTML(post.title)}</span>
          </a>
        </div>
        <p class="cell-excerpt">${escapeHTML(post.body.join(" "))}</p>
      </td>
      <td><span class="badge" data-cat="${escapeHTML(post.categoryId)}">${escapeHTML(
    getCategoryLabel(post.categoryId)
  )}</span></td>
      <td class="cell-meta"><time datetime="${escapeHTML(post.dateISO)}">${relativeDate(
    post.dateISO
  )}</time></td>
      <td class="cell-stats">
        ${metricCellHTML("liram", reads)}
        ${metricCellHTML("curtiram", likes)}
      </td>
      <td>
        <a class="btn btn-ghost" href="#/analytics/${escapeHTML(post.id)}">Detalhes</a>
      </td>
    </tr>`;
}

export async function render(root) {
  root.innerHTML = `
    <div class="page-head">
      <p class="page-subtitle" id="analytics-count" aria-live="polite"></p>
    </div>
    <div class="card table-wrap">
      <table id="analytics-table">
        <thead>
          <tr>
            <th scope="col">Título</th>
            <th scope="col">Categoria</th>
            <th scope="col">Data</th>
            <th scope="col">Engajamento</th>
            <th scope="col"><span class="visually-hidden">Detalhes</span></th>
          </tr>
        </thead>
        <tbody id="analytics-tbody"></tbody>
      </table>
      <div id="list-empty" hidden></div>
    </div>`;

  const posts = await listPosts();
  const summary = await getInteractionsSummary();
  const tbody = root.querySelector("#analytics-tbody");
  const empty = root.querySelector("#list-empty");
  const table = root.querySelector("#analytics-table");
  const count = root.querySelector("#analytics-count");

  count.textContent =
    posts.length === 1 ? "1 comunicado" : `${posts.length} comunicados`;

  if (posts.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    empty.innerHTML = emptyStateHTML({
      title: "Nenhum comunicado publicado",
      message:
        "As métricas de leitura e curtidas aparecem aqui no painel de cada comunicado.",
    });
    return;
  }

  table.hidden = false;
  empty.hidden = true;
  tbody.innerHTML = posts.map((post) => rowHTML(post, summary[post.id])).join("");
}
