import { CATEGORIES, getPost, createPost, updatePost, getInteractionAggregate, uploadAttachment, deleteAttachment, uploadCoverImage, deleteCoverImage } from "../../data/posts.js";
import { listGroups, getRecipientCount } from "../../data/groups.js";
import { state } from "../../core/state.js";
import { $, escapeHTML } from "../../core/utils.js";
import { spinnerHTML, sendConfirmModalHTML, attachmentListHTML } from "../../ui/templates.js";
import { showToast } from "../../ui/toast.js";

// Limites de anexo espelhando o backend (fonte de verdade). Ajuste via env no backend.
const MAX_ATTACHMENT_MB = 10;
const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
// Limites da imagem de capa (I-16): teto menor, só imagens, espelhando o backend.
const MAX_COVER_MB = 5;
const ALLOWED_COVER_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

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

// Converte uma data ISO para o formato do input datetime-local (fuso local)
function toDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
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
  // Rascunho (I-02): só existe como edição; publicado/agendado não exibe "Salvar rascunho"
  const isDraft = editing && values.status === "rascunho";

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

      ${
        values.published === false || !editing
          ? `<div class="field">
               <label class="field-label" for="f-publish-at">Agendamento (opcional)</label>
               <input class="input" id="f-publish-at" data-field="publish-at" type="datetime-local"
                      value="${escapeHTML(toDatetimeLocal(values.publishAt))}"
                      aria-describedby="f-publish-hint ${errorId("publish-at")}">
               <p class="field-hint" id="f-publish-hint">
                 ${
                   values.published === false
                     ? "Defina a data/hora de liberação. Enquanto isso, o comunicado aparece com o selo “Agendado” na lista."
                     : "Em branco publica imediatamente. Preenchido, agenda a liberação para uma data futura."
                 }
               </p>
               <p class="field-error" id="${errorId("publish-at")}" hidden></p>
             </div>`
          : ""
      }

      <div class="field">
        <label class="field-label" for="f-expires-at">Validade (opcional)</label>
        <input class="input" id="f-expires-at" data-field="expires-at" type="datetime-local"
               value="${escapeHTML(toDatetimeLocal(values.expiresAt))}"
               aria-describedby="f-expires-hint ${errorId("expires-at")}">
        <p class="field-hint" id="f-expires-hint">
          Em branco = sem validade. Ao expirar, o comunicado sai do app automaticamente.
        </p>
        <p class="field-error" id="${errorId("expires-at")}" hidden></p>
      </div>

      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="f-author-name">Autor — nome</label>
          <input class="input" id="f-author-name" data-field="author-name" type="text"
                 placeholder="Ex.: Marina Duarte"
                 value="${escapeHTML(values.author?.name ?? "")}"
                 aria-describedby="${errorId("author-name")}">
          <p class="field-error" id="${errorId("author-name")}" hidden></p>
        </div>
        <div class="field">
          <label class="field-label" for="f-author-role">Autor — cargo</label>
          <input class="input" id="f-author-role" data-field="author-role" type="text"
                 placeholder="Ex.: Comunicação Interna"
                 value="${escapeHTML(values.author?.role ?? "")}"
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

      <div class="field">
        <label class="field-label" for="f-cover">Imagem de capa (opcional)</label>
        <input class="input" id="f-cover" data-field="cover" type="file"
               accept="${ALLOWED_COVER_TYPES.join(",")}"
               aria-describedby="f-cover-hint ${errorId("cover")}">
        <p class="field-hint" id="f-cover-hint">
          Aparece no topo do card no app do colaborador. Envie PNG, JPEG, GIF ou WebP. Limite de ${MAX_COVER_MB} MB.
        </p>
        <p class="field-error" id="${errorId("cover")}" hidden></p>
        <div id="cover-preview" data-cover-preview></div>
      </div>

      <div class="field">
        <label class="field-label" for="f-attachment">Anexos (opcional)</label>
        <input class="input" id="f-attachment" data-field="attachment" type="file"
               accept="${ALLOWED_ATTACHMENT_TYPES.join(",")}"
               aria-describedby="f-attachment-hint ${errorId("attachment")}">
        <p class="field-hint" id="f-attachment-hint">
          Envie um arquivo PDF ou uma imagem (PNG, JPEG, GIF, WebP). Limite de ${MAX_ATTACHMENT_MB} MB.
        </p>
        <p class="field-error" id="${errorId("attachment")}" hidden></p>
        <div id="attachment-list" data-attachment-container>
          ${attachmentListHTML(values.attachments)}
        </div>
      </div>

      <div class="form-actions">
        <a class="btn btn-ghost" href="#/posts">Cancelar</a>
        ${
          editing && !isDraft
            ? ""
            : `<button class="btn btn-ghost" id="form-draft" type="button">
                 <span>Salvar rascunho</span>
               </button>`
        }
        <button class="btn btn-primary" id="form-submit" type="submit">
          <span>${editing && !isDraft ? "Salvar alterações" : "Publicar comunicado"}</span>
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
    publishAt: root.querySelector("#f-publish-at"),
    expiresAt: root.querySelector("#f-expires-at"),
    cover: root.querySelector("#f-cover"),
    attachment: root.querySelector("#f-attachment"),
  };
  const coverPreview = root.querySelector("[data-cover-preview]");
  const attachmentContainer = root.querySelector("[data-attachment-container]");
  const currentAttachments = [...(values.attachments || [])];
  let pendingFile = null;
  let currentPostId = editing ? id : null;
  // Imagem de capa (I-16): estado do form — URL existente, arquivo pendente e remoção.
  let currentCover = values.coverImage || null;
  let pendingCoverFile = null;
  let coverRemoved = false;
  let pendingObjectUrl = null;

  renderCoverPreview();

  function renderCoverPreview() {
    if (pendingObjectUrl) {
      URL.revokeObjectURL(pendingObjectUrl);
      pendingObjectUrl = null;
    }
    if (pendingCoverFile) {
      pendingObjectUrl = URL.createObjectURL(pendingCoverFile);
      coverPreview.innerHTML = `
        <div class="cover-preview">
          <img src="${pendingObjectUrl}" alt="Nova capa">
          <span class="cover-status">Nova capa (aguardando salvar)</span>
          <button class="btn btn-ghost" type="button" data-cover-action="clear-pending">Cancelar seleção</button>
        </div>`;
      return;
    }
    if (coverRemoved || currentCover) {
      coverPreview.innerHTML = `
        <div class="cover-preview">
          ${currentCover ? `<img src="${escapeHTML(currentCover)}" alt="Imagem de capa atual">` : ""}
          <span class="cover-status">${coverRemoved ? "Capa removida — será apagada ao salvar." : "Capa atual do comunicado."}</span>
          <button class="btn btn-ghost" type="button" data-cover-action="remove">
            ${coverRemoved ? "Desfazer remoção" : "Remover capa"}
          </button>
        </div>`;
      return;
    }
    coverPreview.innerHTML = "";
  }

  function isCoverAllowed(file) {
    if (!file) return true;
    if (file.size > MAX_COVER_MB * 1024 * 1024) {
      return { ok: false, message: `Imagem muito grande. Limite máximo é ${MAX_COVER_MB} MB.` };
    }
    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      return { ok: false, message: "Tipo de imagem não permitido. Envie PNG, JPEG, GIF ou WebP." };
    }
    return { ok: true };
  }

  function renderAttachments() {
    attachmentContainer.innerHTML = attachmentListHTML(currentAttachments);
  }

  function isFileAllowed(file) {
    if (!file) return true;
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      return { ok: false, message: `Arquivo muito grande. Limite máximo é ${MAX_ATTACHMENT_MB} MB.` };
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return { ok: false, message: "Tipo de arquivo não permitido. Envie PDF ou imagem (PNG, JPEG, GIF, WebP)." };
    }
    return { ok: true };
  }

  async function uploadPendingFile(postId) {
    if (!pendingFile) return;
    const file = pendingFile;
    pendingFile = null;
    try {
      const attachment = await uploadAttachment(postId, file);
      currentAttachments.push(attachment);
      renderAttachments();
    } catch (err) {
      showToast(err.message || "Erro ao anexar o arquivo.");
    }
  }

  async function removeAttachmentHandler(attachmentId) {
    const attachment = currentAttachments.find((a) => a.id === attachmentId);
    if (!attachment) return;
    const postIdForRemove = currentPostId;
    if (postIdForRemove) {
      try {
        await deleteAttachment(postIdForRemove, attachmentId);
      } catch {
        /* melhor esforço */
      }
    }
    const idx = currentAttachments.findIndex((a) => a.id === attachmentId);
    if (idx >= 0) currentAttachments.splice(idx, 1);
    renderAttachments();
  }

  input.cover.addEventListener("change", () => {
    const file = input.cover.files?.[0] || null;
    const res = isCoverAllowed(file);
    if (!res.ok) {
      showError(input.cover, res.message);
      input.cover.value = "";
      return;
    }
    clearErrors(root);
    // Selecionar arquivo novo substitui a capa atual (remoção pendente é descartada).
    if (file) {
      pendingCoverFile = file;
      coverRemoved = false;
    } else {
      pendingCoverFile = null;
    }
    renderCoverPreview();
  });

  coverPreview.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-cover-action]");
    if (!btn) return;
    const action = btn.dataset.coverAction;
    if (action === "remove") {
      pendingCoverFile = null;
      coverRemoved = !coverRemoved;
      input.cover.value = "";
      renderCoverPreview();
    } else if (action === "clear-pending") {
      pendingCoverFile = null;
      input.cover.value = "";
      renderCoverPreview();
    }
  });

  input.attachment.addEventListener("change", () => {
    const file = input.attachment.files?.[0] || null;
    const res = isFileAllowed(file);
    if (!res.ok) {
      showError(input.attachment, res.message);
      input.attachment.value = "";
      return;
    }
    clearErrors(root);
    pendingFile = file;
  });

  attachmentContainer.addEventListener("click", async (event) => {
    const btn = event.target.closest(".js-remove-attachment");
    if (!btn) return;
    await removeAttachmentHandler(btn.dataset.attachmentId);
  });

  form.addEventListener("input", (event) => {
    const field = event.target.closest("[data-field]");
    if (field && field.classList.contains("has-error")) {
      field.classList.remove("has-error");
      field.removeAttribute("aria-invalid");
      document.getElementById(errorId(field.dataset.field)).hidden = true;
    }
  });

  const mainLabel = editing && !isDraft ? "Salvar alterações" : "Publicar comunicado";

  const draftBtn = root.querySelector("#form-draft");
  const setLoading = (loading) => {
    submit.disabled = loading;
    submit.classList.toggle("is-loading", loading);
    submit.innerHTML = loading
      ? spinnerHTML(editing ? "Salvando…" : "Publicando…")
      : `<span>${mainLabel}</span>`;
    if (draftBtn) draftBtn.disabled = loading;
  };

  function closeSendModal() {
    $("#modal-root").innerHTML = "";
    if (state.modalKeyHandler) {
      document.removeEventListener("keydown", state.modalKeyHandler);
      state.modalKeyHandler = null;
    }
  }

  /* Pequeno delay — mantém o estado de loading perceptível. */
  function persist(data, kind = "publish") {
    setLoading(true);
    setTimeout(async () => {
      try {
        let postId = id;
        if (editing) {
          await updatePost(id, data);
          postId = id;
        } else {
          const created = await createPost(data);
          postId = created?.id;
          currentPostId = postId;
        }
        if (pendingFile && postId) {
          await uploadPendingFile(postId);
        }
        if (postId) {
          // Imagem de capa (I-16): staged — JSON primeiro; capa só depois do post existir.
          if (pendingCoverFile) {
            await uploadCoverImage(postId, pendingCoverFile);
            pendingCoverFile = null;
            coverRemoved = false;
          } else if (coverRemoved) {
            await deleteCoverImage(postId);
            coverRemoved = false;
          }
        }
        showToast(
          kind === "draft"
            ? "Rascunho salvo com sucesso"
            : !editing && data.publishAt
              ? "Comunicado agendado com sucesso"
              : editing
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
      scheduledAt: data.publishAt || null,
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

  if (draftBtn) {
    draftBtn.addEventListener("click", () => {
      clearErrors(root);
      // Rascunho (I-02): salva sem exigir campos obrigatórios e sem abrir modal
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
        status: "draft",
      };
      if (input.expiresAt) {
        const raw = input.expiresAt.value;
        if (raw) data.expiresAt = new Date(raw).toISOString();
        else if (editing) data.expiresAt = "";
      }
      if (editing) delete data.targetGroups;
      persist(data, "draft");
    });
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

    // Agendamento: opcional, mas sempre no futuro.
    // Em edição de agendado, limpar a data = publicar agora.
    if (input.publishAt) {
      const raw = input.publishAt.value;
      if (raw) {
        const when = new Date(raw);
        if (Number.isNaN(when.getTime())) {
          fail(input.publishAt, "Data de agendamento inválida.");
        } else if (when.getTime() <= Date.now()) {
          fail(input.publishAt, "Escolha uma data e hora futuras.");
        } else {
          data.publishAt = when.toISOString();
        }
      } else if (editing && values.published === false) {
        data.publishAt = ""; // publica agora
      }
    }

    // Validade (I-05): opcional — vazio omite (criação) ou limpa (edição, reativa);
    // preenchido envia ISO. Passado é aceito pelo backend (expiração imediata).
    if (input.expiresAt) {
      const raw = input.expiresAt.value;
      if (raw) {
        const when = new Date(raw);
        if (Number.isNaN(when.getTime())) {
          fail(input.expiresAt, "Data de validade inválida.");
        } else {
          data.expiresAt = when.toISOString();
        }
      } else if (editing) {
        data.expiresAt = "";
      }
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (editing) {
      /* Alvo imutável — PUT rejeita targetGroups com 400. */
      delete data.targetGroups;
      if (isDraft) {
        // Rascunho (I-02): publicar agora ou agendar, conforme a data
        if (data.publishAt && data.publishAt !== "") {
          data.status = "scheduled";
        } else {
          data.status = "published";
          delete data.publishAt;
        }
      } else if (values.published !== false) {
        /* Comunicado já publicado não pode ser reagendado. */
        delete data.publishAt;
      }
      persist(data);
    } else {
      openSendConfirmModal(data);
    }
  });
}
