import { CATEGORIES, getPost, createPost, updatePost, getInteractionAggregate } from "../../data/posts.js";
import { listGroups, getRecipientCount } from "../../data/groups.js";
import { state } from "../../core/state.js";
import { $, escapeHTML } from "../../core/utils.js";
import { spinnerHTML, sendConfirmModalHTML } from "../../ui/templates.js";
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

function groupOptionHTML(group, checked, disabled) {
  return `
    <label class="group-option ${disabled ? "is-disabled" : ""}">
      <input type="checkbox" name="target-groups" value="${escapeHTML(group.id)}"
             ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span class="group-option-text">${escapeHTML(group.name)}</span>
    </label>`;
}

export async function render(root, { id } = {}) {
  const editing = Boolean(id);
  const post = editing ? await getPost(id) : null;

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
    targetGroups: [],
  };
  const selectedGroups = values.targetGroups || [];

  let metricsHTML = "";
  if (editing) {
    const agg = await getInteractionAggregate(id);
    if (agg) {
      const byGroup = (agg.byGroup || [])
        .map(
          (g) =>
            `<span class="metric-group">${escapeHTML(g.name)}: ${g.reads} liram · ${g.likes} curtiram</span>`
        )
        .join("");
      metricsHTML = `
        <div class="card metrics-card" id="post-metrics">
          <h2 class="metrics-title">Métricas de leitura</h2>
          <div class="metrics-summary">
            <span class="metric-total"><strong>${agg.totalReads}</strong> leituras</span>
            <span class="metric-total"><strong>${agg.totalLikes}</strong> curtidas</span>
          </div>
          ${byGroup ? `<div class="metrics-groups">${byGroup}</div>` : ""}
        </div>`;
    }
  }

  /* Alvo imutável após publicação — em edição, exibe também grupos-alvo já desativados. */
  const groups = (await listGroups()).filter(
    (group) => group.active || (editing && selectedGroups.includes(group.id))
  );

  root.innerHTML = `
    <a class="back-link" href="#/posts">
      <svg width="16" height="16" aria-hidden="true" focusable="false"><use href="#i-arrow-left"/></svg>
      Voltar para a lista
    </a>

    ${metricsHTML}

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

      <fieldset class="field fieldset">
        <legend class="field-label">Grupos-alvo (opcional)</legend>
        ${
          groups.length > 0
            ? `<div class="group-options">
                 ${groups
                   .map((group) =>
                     groupOptionHTML(
                       group,
                       selectedGroups.includes(group.id),
                       editing
                     )
                   )
                   .join("")}
               </div>`
            : '<p class="field-hint">Nenhum grupo ativo cadastrado.</p>'
        }
        <p class="field-hint">${
          editing
            ? "O público-alvo não pode ser alterado após a publicação."
            : "Sem seleção, o comunicado é enviado a todos os colaboradores (broadcast)."
        }</p>
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

  const setLoading = (loading) => {
    submit.disabled = loading;
    submit.classList.toggle("is-loading", loading);
    submit.innerHTML = loading
      ? spinnerHTML(editing ? "Salvando…" : "Publicando…")
      : "<span>" + (editing ? "Salvar alterações" : "Publicar comunicado") + "</span>";
  };

  function closeSendModal() {
    $("#modal-root").innerHTML = "";
    if (state.modalKeyHandler) {
      document.removeEventListener("keydown", state.modalKeyHandler);
      state.modalKeyHandler = null;
    }
  }

  /* Pequeno delay — mantém o estado de loading perceptível. */
  function persist(data) {
    setLoading(true);
    setTimeout(async () => {
      try {
        if (editing) {
          await updatePost(id, data);
        } else {
          await createPost(data);
        }
        showToast(
          editing
            ? "Comunicado atualizado com sucesso"
            : "Comunicado publicado com sucesso"
        );
        location.hash = "#/posts";
      } catch (err) {
        setLoading(false);
        showToast("Erro ao salvar: " + err.message);
      }
    }, 600);
  }

  async function openSendConfirmModal(data) {
    submit.disabled = true;
    let count;
    try {
      ({ count } = await getRecipientCount(data.targetGroups));
    } catch (err) {
      showToast("Erro ao calcular destinatários: " + err.message);
      submit.disabled = false;
      return;
    }
    submit.disabled = false;

    const modalRoot = $("#modal-root");
    modalRoot.innerHTML = sendConfirmModalHTML({
      title: data.title,
      recipientCount: count,
      isBroadcast: data.targetGroups.length === 0,
    });

    const overlay = modalRoot.querySelector(".js-modal-overlay");
    const cancel = modalRoot.querySelector(".js-modal-cancel");
    const confirm = modalRoot.querySelector(".js-modal-confirm");

    state.modalKeyHandler = (event) => {
      if (event.key === "Escape") closeSendModal();
    };
    document.addEventListener("keydown", state.modalKeyHandler);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeSendModal();
    });
    cancel.addEventListener("click", closeSendModal);
    confirm.addEventListener("click", () => {
      closeSendModal();
      persist(data);
    });

    cancel.focus();
  }

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
      targetGroups: [
        ...form.querySelectorAll('input[name="target-groups"]:checked'),
      ].map((el) => el.value),
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

    if (editing) {
      /* Alvo imutável — PUT rejeita targetGroups com 400. */
      delete data.targetGroups;
      persist(data);
    } else {
      openSendConfirmModal(data);
    }
  });
}
