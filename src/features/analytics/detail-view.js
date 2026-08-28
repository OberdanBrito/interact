import { getPost, getInteractionMembers } from "../../data/posts.js";
import { escapeHTML, relativeDate } from "../../core/utils.js";
import { emptyStateHTML } from "../../ui/templates.js";
import { showToast } from "../../ui/toast.js";

const ALL_GROUPS = "__todas__";

let groupFilter = ALL_GROUPS;

function readBadge(read, liked) {
  const parts = [];
  if (read) parts.push('<span class="badge badge-status-active">Leu</span>');
  else parts.push('<span class="badge badge-status-inactive">Não leu</span>');
  if (liked) parts.push('<span class="badge badge-targeted">Curtiu</span>');
  return parts.join(" ");
}

function memberRowHTML(member) {
  const user = member.user;
  if (!user) return "";
  const groups = (user.groups || []).join(", ") || "Sem grupo";
  return `
    <tr>
      <td>
        <div class="cell-author">
          <span class="avatar avatar-sm" aria-hidden="true">${escapeHTML(
            (user.name || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()
          )}</span>
          <span class="cell-author-text">
            <strong>${escapeHTML(user.name)}</strong>
            <span>${escapeHTML(user.email)}</span>
          </span>
        </div>
      </td>
      <td class="cell-meta">${escapeHTML(groups)}</td>
      <td>${readBadge(member.read, member.liked)}</td>
      <td class="cell-meta">${relativeDate(member.readAt)}</td>
    </tr>`;
}

function renderTable(root, members, empty) {
  const tbody = root.querySelector("#members-tbody");
  const table = root.querySelector("#members-table");
  const filtered = members.filter((m) => {
    if (!m.user) return false;
    return (
      groupFilter === ALL_GROUPS || (m.user.groups || []).includes(groupFilter)
    );
  });

  table.hidden = filtered.length === 0;
  empty.hidden = filtered.length > 0;
  empty.innerHTML =
    filtered.length === 0
      ? emptyStateHTML({
          title: "Nenhum registro neste filtro",
          message: "Ajuste o filtro de grupo para ver outros colaboradores.",
        })
      : "";
  tbody.innerHTML = filtered.map(memberRowHTML).join("");
}

export async function render(root, { id } = {}) {
  const post = id ? await getPost(id) : null;
  if (!post) {
    showToast("Comunicado não encontrado");
    location.replace("#/analytics");
    return;
  }

  const members = (await getInteractionMembers(id)).filter((m) => m.user);
  const totalReads = members.filter((m) => m.read).length;
  const totalLikes = members.filter((m) => m.liked).length;
  const groupOptions = [
    ...new Set(members.flatMap((m) => m.user.groups || [])),
  ];

  root.innerHTML = `
    <a class="back-link" href="#/analytics">
      <svg width="16" height="16" aria-hidden="true" focusable="false"><use href="#i-arrow-left"/></svg>
      Voltar para as métricas
    </a>

    <div class="card analytics-head">
      <div class="analytics-head-info">
        <h2>${escapeHTML(post.title)}</h2>
        <p class="cell-excerpt">${escapeHTML(post.body.join(" "))}</p>
        ${
          (post.targetGroupNames || []).filter(Boolean).length > 0
            ? `<p class="analytics-target">Direcionado a: ${escapeHTML(
                post.targetGroupNames.filter(Boolean).join(", ")
              )}</p>`
            : '<p class="analytics-target">Enviado a todos os colaboradores</p>'
        }
      </div>
      <div class="metrics-summary">
        <span class="metric-total"><strong>${totalReads}</strong> leituras</span>
        <span class="metric-total"><strong>${totalLikes}</strong> curtidas</span>
      </div>
    </div>

    <div class="toolbar">
      <select class="input select" id="group-filter" aria-label="Filtrar por grupo">
        <option value="${ALL_GROUPS}">Todos os grupos</option>
        ${groupOptions
          .map((g) => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`)
          .join("")}
      </select>
    </div>

    <div class="card table-wrap">
      <table id="members-table">
        <thead>
          <tr>
            <th scope="col">Colaborador</th>
            <th scope="col">Grupos</th>
            <th scope="col">Interação</th>
            <th scope="col">Leu em</th>
          </tr>
        </thead>
        <tbody id="members-tbody"></tbody>
      </table>
      <div id="list-empty" hidden></div>
    </div>`;

  const filter = root.querySelector("#group-filter");
  filter.value = groupFilter;
  filter.addEventListener("change", () => {
    groupFilter = filter.value;
    renderTable(root, members, root.querySelector("#list-empty"));
  });

  renderTable(root, members, root.querySelector("#list-empty"));
}

export function resetGroupFilter() {
  groupFilter = ALL_GROUPS;
}
