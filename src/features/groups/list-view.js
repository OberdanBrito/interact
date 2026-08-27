import { listGroups, updateGroup } from "../../data/groups.js";
import { groupRowHTML, emptyStateHTML } from "../../ui/templates.js";
import { showToast } from "../../ui/toast.js";

/* Cache local da última listagem — usado para localizar o grupo nas ações. */
let cachedGroups = [];

async function renderRows(root) {
  cachedGroups = await listGroups();
  const tbody = root.querySelector("#groups-tbody");
  const empty = root.querySelector("#list-empty");
  const table = root.querySelector("#groups-table");
  const count = root.querySelector("#groups-count");

  count.textContent =
    cachedGroups.length === 1 ? "1 grupo" : `${cachedGroups.length} grupos`;

  if (cachedGroups.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    empty.innerHTML = emptyStateHTML({
      title: "Nenhum grupo cadastrado",
      message:
        "Grupos permitem direcionar comunicados para públicos específicos.",
      showCta: true,
      ctaHref: "#/groups/nova",
      ctaLabel: "Criar primeiro grupo",
    });
    return;
  }

  table.hidden = false;
  empty.hidden = true;
  tbody.innerHTML = cachedGroups.map(groupRowHTML).join("");
}

export function render(root) {
  root.innerHTML = `
    <div class="page-head">
      <p class="page-subtitle" id="groups-count" aria-live="polite"></p>
    </div>

    <div class="toolbar">
      <a class="btn btn-primary" href="#/groups/nova">
        <svg width="18" height="18" aria-hidden="true" focusable="false"><use href="#i-plus"/></svg>
        <span>Novo grupo</span>
      </a>
    </div>

    <div class="card table-wrap">
      <table id="groups-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Status</th>
            <th scope="col"><span class="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody id="groups-tbody"></tbody>
      </table>
      <div id="list-empty" hidden></div>
    </div>`;

  root.querySelector("#groups-tbody").addEventListener("click", async (event) => {
    const btn = event.target.closest(".js-toggle-active");
    if (!btn) return;
    const group = cachedGroups.find((g) => g.id === btn.dataset.groupId);
    if (!group) return;
    btn.disabled = true;
    try {
      await updateGroup(group.id, { active: !group.active });
      showToast(group.active ? "Grupo desativado" : "Grupo ativado");
    } catch (err) {
      showToast("Erro ao atualizar: " + err.message);
    }
    renderRows(root);
  });

  renderRows(root);
}
