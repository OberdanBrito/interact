import { CATEGORIES, getPost, createPost, updatePost } from "../../data/posts.js";
import { escapeHTML } from "../../core/utils.js";
import { spinnerHTML } from "../../ui/templates.js";
import { showToast } from "../../ui/toast.js";

const FIELDS = ["title", "category", "author-name", "author-role", "body"];

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

function parseBody(text) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function readModeCardHTML(value, title, hint, checked) {
  return `
    <label class="radio-card">
      <input type="radio" name="read-mode" value="${value}" ${checked ? "checked" : ""}>
      <span class="radio-card-body">
        <strong>${title}</strong>
        <span>${hint}</span>
      </span>
    </label>`;
}

export function render(root, { id } = {}) {
  const editing = Boolean(id);
  const post = editing ? getPost(id) : null;

  if (editing && !post) {
    showToast("Comunicado não encontrado");
    location.replace("#/posts");
    return;
  }

  const values = post || {
    title: "",
    categoryId: "geral",
    readMode: "auto",
    urgent: false,
    author: { name: "", role: "" },
    body: [],
  };

  root.innerHTML = `
    <a class="back-link" href="#/posts">
      <svg width="16" height="16" aria-hidden="true" focusable="false"><use href="#i-arrow-left"/></svg>
      Voltar para a lista
    </a>

    <form class="card form-card" id="post-form" novalidate>
      <div class="field">
        <label class="field-label" for="f-title">Título</label>
        <input class="input" id="f-title" data-field="title" type="text" maxlength="120"
               placeholder="Ex.: Nova política de home office"
               value="${escapeHTML(values.title)}"
               aria-describedby="${errorId("title")}">
        <p class="field-error" id="${errorId("title")}" hidden></p>
      </div>

      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="f-category">Categoria</label>
          <select class="input select" id="f-category" data-field="category"
                  aria-describedby="${errorId("category")}">
            ${CATEGORIES.map(
              (cat) =>
                `<option value="${cat.id}" ${
                  values.categoryId === cat.id ? "selected" : ""
                }>${cat.label}</option>`
            ).join("")}
          </select>
          <p class="field-error" id="${errorId("category")}" hidden></p>
        </div>

        <div class="field">
          <span class="field-label" id="urgent-label">Prioridade</span>
          <label class="toggle">
            <input type="checkbox" id="f-urgent" ${values.urgent ? "checked" : ""}>
            <span class="toggle-track" aria-hidden="true"></span>
            <span class="toggle-text">
              <strong>Marcar como urgente</strong>
              <span>Exibe o selo “Urgente” em destaque no app.</span>
            </span>
          </label>
        </div>
      </div>

      <fieldset class="field fieldset">
        <legend class="field-label">Modo de leitura</legend>
        <div class="radio-cards">
          ${readModeCardHTML(
            "auto",
            "Automática",
            "O app marca como lido após alguns segundos de leitura.",
            values.readMode === "auto"
          )}
          ${readModeCardHTML(
            "ack",
            "Confirmação",
            "O colaborador precisa tocar em “Confirmar leitura”.",
            values.readMode === "ack"
          )}
        </div>
      </fieldset>

      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="f-author-name">Autor — nome</label>
          <input class="input" id="f-author-name" data-field="author-name" type="text"
                 placeholder="Ex.: Marina Duarte"
                 value="${escapeHTML(values.author.name)}"
                 aria-describedby="${errorId("author-name")}">
          <p class="field-error" id="${errorId("author-name")}" hidden></p>
        </div>
        <div class="field">
          <label class="field-label" for="f-author-role">Autor — cargo</label>
          <input class="input" id="f-author-role" data-field="author-role" type="text"
                 placeholder="Ex.: Comunicação Interna"
                 value="${escapeHTML(values.author.role)}"
                 aria-describedby="${errorId("author-role")}">
          <p class="field-error" id="${errorId("author-role")}" hidden></p>
        </div>
      </div>

      <div class="field">
        <label class="field-label" for="f-body">Conteúdo</label>
        <textarea class="input textarea" id="f-body" data-field="body" rows="9"
                  placeholder="Escreva o comunicado. Separe os parágrafos com uma linha em branco."
                  aria-describedby="f-body-hint ${errorId("body")}">${escapeHTML(
                    values.body.join("\n\n")
                  )}</textarea>
        <p class="field-hint" id="f-body-hint">Cada parágrafo vira um bloco de texto no app. Separe-os com uma linha em branco.</p>
        <p class="field-error" id="${errorId("body")}" hidden></p>
      </div>

      <div class="form-actions">
        <a class="btn btn-ghost" href="#/posts">Cancelar</a>
        <button class="btn btn-primary" id="form-submit" type="submit">
          <span>${editing ? "Salvar alterações" : "Publicar comunicado"}</span>
        </button>
      </div>
    </form>`;

  const form = root.querySelector("#post-form");
  const submit = root.querySelector("#form-submit");
  const input = {
    title: root.querySelector("#f-title"),
    category: root.querySelector("#f-category"),
    authorName: root.querySelector("#f-author-name"),
    authorRole: root.querySelector("#f-author-role"),
    body: root.querySelector("#f-body"),
    urgent: root.querySelector("#f-urgent"),
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
      title: input.title.value.trim(),
      categoryId: input.category.value,
      readMode: form.elements["read-mode"].value === "ack" ? "ack" : "auto",
      urgent: input.urgent.checked,
      author: {
        name: input.authorName.value.trim(),
        role: input.authorRole.value.trim(),
      },
      body: parseBody(input.body.value),
    };

    let firstInvalid = null;
    const fail = (el, message) => {
      showError(el, message);
      firstInvalid = firstInvalid || el;
    };
    if (data.title.length < 3)
      fail(input.title, "Informe um título com pelo menos 3 caracteres.");
    if (!CATEGORIES.some((cat) => cat.id === data.categoryId))
      fail(input.category, "Selecione uma categoria válida.");
    if (!data.author.name) fail(input.authorName, "Informe o nome do autor.");
    if (!data.author.role) fail(input.authorRole, "Informe o cargo do autor.");
    if (data.body.length === 0)
      fail(input.body, "Escreva ao menos um parágrafo de conteúdo.");

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    submit.disabled = true;
    submit.classList.add("is-loading");
    submit.innerHTML = spinnerHTML(editing ? "Salvando…" : "Publicando…");

    /* Latência simulada — mantém o estado de loading perceptível. */
    setTimeout(() => {
      if (editing) {
        updatePost(id, data);
        showToast("Comunicado atualizado com sucesso");
      } else {
        createPost(data);
        showToast("Comunicado publicado com sucesso");
      }
      location.hash = "#/posts";
    }, 600);
  });
}
