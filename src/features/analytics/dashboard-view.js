import { listPosts, getInteractionsSummary } from "../../data/posts.js";
import { listGroups } from "../../data/groups.js";
import { escapeHTML, relativeDate } from "../../core/utils.js";
import { emptyStateHTML } from "../../ui/templates.js";

const ALL_GROUPS = "__todas__";

function dateToISO(value, endOfDay = false) {
  if (!value) return "";
  const iso = new Date(
    endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`
  );
  return Number.isNaN(iso.getTime()) ? "" : iso.toISOString();
}

function pct(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

function rankRowHTML(post, reads, likes) {
  return `
    <tr>
      <td class="cell-post">
        <div class="cell-title">
          <a class="cell-title-link" href="#/analytics/${escapeHTML(post.id)}">
            <span class="cell-title-text">${escapeHTML(post.title)}</span>
          </a>
        </div>
      </td>
      <td class="cell-meta"><time datetime="${escapeHTML(post.dateISO)}">${relativeDate(
        post.dateISO
      )}</time></td>
      <td class="cell-stats">
        <span class="metric-stat"><strong>${reads}</strong> lidos</span>
        <span class="metric-stat"><strong>${likes}</strong> curtidas</span>
      </td>
    </tr>`;
}

function fillRanking(tbody, list, empty) {
  const table = tbody.closest("table");
  table.hidden = list.length === 0;
  empty.hidden = list.length > 0;
  empty.innerHTML =
    list.length === 0
      ? emptyStateHTML({
          title: "Nenhum comunicado no recorte",
          message: "Ajuste os filtros para ver outros comunicados.",
        })
      : "";
  tbody.innerHTML = list
    .map(({ post, reads, likes }) => rankRowHTML(post, reads, likes))
    .join("");
}

export async function render(root) {
  const posts = await listPosts();
  const groups = await listGroups();

  root.innerHTML = `
    <div class="page-head">
      <p class="page-subtitle" id="dashboard-count" aria-live="polite"></p>
    </div>
    <div class="toolbar">
      <label class="field-label" for="dash-desde">De
        <input class="input" type="date" id="dash-desde" aria-label="Data inicial">
      </label>
      <label class="field-label" for="dash-ate">Até
        <input class="input" type="date" id="dash-ate" aria-label="Data final">
      </label>
      <select class="input select" id="dash-group" aria-label="Filtrar por grupo">
        <option value="${ALL_GROUPS}">Todos os grupos</option>
        ${groups
          .map(
            (g) =>
              `<option value="${escapeHTML(g.id)}">${escapeHTML(g.name)}</option>`
          )
          .join("")}
      </select>
    </div>
    <div class="card metrics-card">
      <h2 class="metrics-title">Visão geral</h2>
      <div class="metrics-summary">
        <span class="metric-total"><strong id="dash-total">0</strong> comunicados</span>
        <span class="metric-total"><strong id="dash-read">0%</strong> lidos</span>
        <span class="metric-total"><strong id="dash-like">0%</strong> curtidos</span>
      </div>
    </div>
    <div class="card table-wrap">
      <h2 class="metrics-title">Mais lidos</h2>
      <table id="dash-top">
        <thead>
          <tr>
            <th scope="col">Título</th>
            <th scope="col">Data</th>
            <th scope="col">Engajamento</th>
          </tr>
        </thead>
        <tbody id="dash-top-body"></tbody>
      </table>
      <div id="dash-top-empty" hidden></div>
    </div>
    <div class="card table-wrap">
      <h2 class="metrics-title">Menos lidos</h2>
      <table id="dash-bottom">
        <thead>
          <tr>
            <th scope="col">Título</th>
            <th scope="col">Data</th>
            <th scope="col">Engajamento</th>
          </tr>
        </thead>
        <tbody id="dash-bottom-body"></tbody>
      </table>
      <div id="dash-bottom-empty" hidden></div>
    </div>`;

  const count = root.querySelector("#dashboard-count");
  const totalEl = root.querySelector("#dash-total");
  const readEl = root.querySelector("#dash-read");
  const likeEl = root.querySelector("#dash-like");
  const topBody = root.querySelector("#dash-top-body");
  const bottomBody = root.querySelector("#dash-bottom-body");
  const topEmpty = root.querySelector("#dash-top-empty");
  const bottomEmpty = root.querySelector("#dash-bottom-empty");
  const desdeInput = root.querySelector("#dash-desde");
  const ateInput = root.querySelector("#dash-ate");
  const groupSelect = root.querySelector("#dash-group");

  async function apply() {
    const summary = await getInteractionsSummary({
      desde: dateToISO(desdeInput.value),
      ate: dateToISO(ateInput.value, true),
      groupId: groupSelect.value === ALL_GROUPS ? "" : groupSelect.value,
    });

    const rows = posts.map((post) => {
      const m = summary[post.id] ?? { reads: 0, likes: 0 };
      return { post, reads: m.reads ?? 0, likes: m.likes ?? 0 };
    });

    const total = rows.length;
    const readPosts = rows.filter((r) => r.reads > 0).length;
    const likePosts = rows.filter((r) => r.likes > 0).length;

    count.textContent =
      total === 1 ? "1 comunicado" : `${total} comunicados`;
    totalEl.textContent = total;
    readEl.textContent = `${pct(readPosts, total)}%`;
    likeEl.textContent = `${pct(likePosts, total)}%`;

    const top = [...rows].sort((a, b) => b.reads - a.reads).slice(0, 10);
    const bottom = [...rows].sort((a, b) => a.reads - b.reads).slice(0, 10);
    fillRanking(topBody, top, topEmpty);
    fillRanking(bottomBody, bottom, bottomEmpty);
  }

  fromEvent(desdeInput, apply);
  fromEvent(ateInput, apply);
  fromEvent(groupSelect, apply);
  await apply();
}

function fromEvent(el, fn) {
  el.addEventListener("change", fn);
}
