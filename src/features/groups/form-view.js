import { listGroups, createGroup, updateGroup } from "../../data/groups.js";
import { escapeHTML } from "../../core/utils.js";
import { spinnerHTML } from "../../ui/templates.js";
import { showToast } from "../../ui/toast.js";

function errorId(id) {
  return `f-${id}-error`;
}

function showError(input, message) {
  const error = document.getElementById(errorId(input.dataset.field));
  input.classList.add("has-error");
  input.setAttribute("aria-invalid", "true");
  error.textContent = message;
  error.hidden = false;
}

function clearErrors(root) {
  root.querySelectorAll(".has-error").forEach((el) => {
    el.classList.remove("has-error");
    el.removeAttribute("aria-invalid");
  });
  root.querySelectorAll(".field-error").forEach((el) => {
    el.hidden = true;
  });
}

export async function render(root, { id } = {}) {
  const editing = Boolean(id);
  const group = editing
    ? (await listGroups()).find((g) => g.id === id)
    : null;

  if (editing && !group) {
    showToast("Grupo não encontrado");
    location.replace("#/groups");
    return;
  }

  const values = group || { name: "", active: true };

  root.innerHTML = `
    <a class="back-link" href="#/groups">
      <svg width="16" height="16" aria-hidden="true" focusable="false"><use href="#i-arrow-left"/></svg>
      Voltar para a lista
    </a>

    <form class="card form-card" id="group-form" novalidate>
      <div class="field">
        <label class="field-label" for="f-name">Nome</label>
        <input class="input" id="f-name" data-field="name" type="text" maxlength="80"
               placeholder="Ex.: Operações"
               value="${escapeHTML(values.name)}"
               aria-describedby="${errorId("name")}">
        <p class="field-error" id="${errorId("name")}" hidden></p>
      </div>

      <div class="field">
        <span class="field-label" id="active-label">Status</span>
        <label class="toggle">
          <input type="checkbox" id="f-active" ${values.active ? "checked" : ""}>
          <span class="toggle-track" aria-hidden="true"></span>
          <span class="toggle-text">
            <strong>Grupo ativo</strong>
            <span>Grupos inativos não aparecem como alvo de novos comunicados.</span>
          </span>
        </label>
      </div>

      <div class="form-actions">
        <a class="btn btn-ghost" href="#/groups">Cancelar</a>
        <button class="btn btn-primary" id="form-submit" type="submit">
          <span>${editing ? "Salvar alterações" : "Criar grupo"}</span>
        </button>
      </div>
    </form>`;

  const form = root.querySelector("#group-form");
  const submit = root.querySelector("#form-submit");
  const input = {
    name: root.querySelector("#f-name"),
    active: root.querySelector("#f-active"),
  };

  form.addEventListener("input", (event) => {
    const field = event.target.closest("[data-field]");
    if (field && field.classList.contains("has-error")) {
      field.classList.remove("has-error");
      field.removeAttribute("aria-invalid");
      document.getElementById(errorId(field.dataset.field)).hidden = true;
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors(root);

    const data = {
      name: input.name.value.trim(),
      active: input.active.checked,
    };

    if (data.name.length < 1) {
      showError(input.name, "Informe o nome do grupo.");
      input.name.focus();
      return;
    }

    submit.disabled = true;
    submit.classList.add("is-loading");
    submit.innerHTML = spinnerHTML(editing ? "Salvando…" : "Criando…");

    /* Pequeno delay — mantém o estado de loading perceptível. */
    setTimeout(async () => {
      try {
        if (editing) {
          await updateGroup(id, data);
        } else {
          await createGroup({ name: data.name });
        }
        showToast(
          editing
            ? "Grupo atualizado com sucesso"
            : "Grupo criado com sucesso"
        );
        location.hash = "#/groups";
      } catch (err) {
        submit.disabled = false;
        submit.classList.remove("is-loading");
        submit.innerHTML =
          "<span>" + (editing ? "Salvar alterações" : "Criar grupo") + "</span>";
        showToast("Erro ao salvar: " + err.message);
      }
    }, 600);
  });
}
