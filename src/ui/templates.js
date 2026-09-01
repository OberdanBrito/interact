import { escapeHTML, relativeDate, fullDate, initialsOf } from "../core/utils.js";
import { getCategoryLabel } from "../data/posts.js";

const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="#${name}"/></svg>`;

export function shellHTML({ user, sectionTitle, active }) {
  const name = escapeHTML(user.name);
  const email = escapeHTML(user.email);
  const initials = escapeHTML(initialsOf(user.name));
  return `
    <div class="shell">
      <aside class="sidebar">
        <a class="brand" href="#/posts" aria-label="Interact Admin — início">
          <span class="brand-mark" aria-hidden="true">I</span>
          <span class="brand-text">
            <strong>Interact</strong>
            <span>Admin</span>
          </span>
        </a>
        <nav class="sidebar-nav" aria-label="Navegação principal">
          <a class="nav-item ${active === "posts" ? "is-active" : ""}" href="#/posts"
             ${active === "posts" ? 'aria-current="page"' : ""}>
            ${icon("i-megaphone")}
            <span>Comunicados</span>
          </a>
          <a class="nav-item ${active === "groups" ? "is-active" : ""}" href="#/groups"
             ${active === "groups" ? 'aria-current="page"' : ""}>
            ${icon("i-users")}
            <span>Grupos</span>
          </a>
          <a class="nav-item ${active === "analytics" ? "is-active" : ""}" href="#/analytics"
             ${active === "analytics" ? 'aria-current="page"' : ""}>
            ${icon("i-inbox")}
            <span>Leituras</span>
          </a>
          <a class="nav-item ${active === "dashboard" ? "is-active" : ""}" href="#/dashboard"
             ${active === "dashboard" ? 'aria-current="page"' : ""}>
            ${icon("i-chart")}
            <span>Dashboard</span>
          </a>
        </nav>
        <div class="sidebar-cta">
          <a class="btn btn-primary btn-block" href="#/posts/nova">
            ${icon("i-plus")}
            <span>Nova publicação</span>
          </a>
        </div>
        <p class="sidebar-foot">Interact Corp<br>Comunicação interna</p>
      </aside>
      <div class="shell-main">
        <header class="topbar">
          <h1 class="topbar-title">${escapeHTML(sectionTitle)}</h1>
          <div class="topbar-user">
            <span class="avatar" aria-hidden="true">${initials}</span>
            <span class="topbar-user-text">
              <strong>${name}</strong>
              <span>${email}</span>
            </span>
            <button type="button" class="icon-btn js-logout" aria-label="Sair da conta" title="Sair">
              ${icon("i-logout", 20)}
            </button>
          </div>
        </header>
        <main class="content" id="view" tabindex="-1"></main>
      </div>
    </div>`;
}

export function categoryBadgeHTML(categoryId) {
  return `<span class="badge" data-cat="${escapeHTML(categoryId)}">${escapeHTML(
    getCategoryLabel(categoryId)
  )}</span>`;
}

export function urgentBadgeHTML() {
  return `<span class="badge badge-urgent">${icon("i-alert", 12)} Urgente</span>`;
}

export function pinnedBadgeHTML() {
  return `<span class="badge badge-pinned">${icon("i-pin", 12)} Fixado</span>`;
}

export function targetedBadgeHTML() {
  return `<span class="badge badge-targeted">${icon("i-users", 12)} Direcionado</span>`;
}

export function scheduledBadgeHTML() {
  return `<span class="badge badge-scheduled">${icon("i-alert", 12)} Agendado</span>`;
}

export function draftBadgeHTML() {
  return `<span class="badge badge-draft">${icon("i-edit", 12)} Rascunho</span>`;
}

export function expiredBadgeHTML() {
  return `<span class="badge badge-expired">${icon("i-alert", 12)} Expirado</span>`;
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentListHTML(attachments) {
  const list = attachments || [];
  if (list.length === 0) return "";
  return `
    <div class="attachment-list" data-attachment-list>
      ${list
        .map(
          (a) => `
        <span class="attachment-item" data-attachment-id="${escapeHTML(a.id)}">
          <span class="attachment-name">${escapeHTML(a.name || "—")}</span>
          <span class="attachment-meta">${escapeHTML(a.type || "")} · ${escapeHTML(
            formatFileSize(a.size)
          )}</span>
          <button type="button" class="icon-btn attachment-remove js-remove-attachment"
                  data-attachment-id="${escapeHTML(a.id)}" aria-label="Remover anexo ${escapeHTML(
            a.name || ""
          )}">
            ${icon("i-x", 14)}
          </button>
        </span>`
        )
        .join("")}
    </div>`;
}

export function readModeLabel(readMode) {
  return readMode === "ack" ? "Confirmação" : "Automática";
}

export function postRowHTML(post) {
  const id = escapeHTML(post.id);
  const title = escapeHTML(post.title);
  const authorName = escapeHTML(post.author?.name || "—");
  const authorRole = post.author?.role ? escapeHTML(post.author.role) : "";
  return `
    <tr data-post-id="${id}">
      <td class="cell-post">
        <div class="cell-title">
          <span class="cell-title-text">${title}</span>
          ${post.expired ? expiredBadgeHTML() : ""}
          ${post.status === "agendado" ? scheduledBadgeHTML() : ""}
          ${post.status === "rascunho" ? draftBadgeHTML() : ""}
          ${post.pinned ? pinnedBadgeHTML() : ""}
          ${post.urgent ? urgentBadgeHTML() : ""}
          ${(post.targetGroups || []).length > 0 ? targetedBadgeHTML() : ""}
        </div>
        <p class="cell-excerpt">${escapeHTML(post.body.join(" "))}</p>
      </td>
      <td>${categoryBadgeHTML(post.categoryId)}</td>
      <td class="cell-meta">${readModeLabel(post.readMode)}</td>
      <td class="cell-meta">
        <time datetime="${escapeHTML(post.dateISO)}"
          title="${escapeHTML(fullDate(post.dateISO))}">${relativeDate(post.dateISO)}</time>
        ${
          post.expiresAt
            ? `<span class="cell-expiry">Expira em ${escapeHTML(fullDate(post.expiresAt))}</span>`
            : ""
        }
      </td>
      <td>
        <div class="cell-author">
          <span class="avatar avatar-sm" aria-hidden="true">${escapeHTML(
            initialsOf(post.author?.name || "")
          )}</span>
          <span class="cell-author-text">
            <strong>${authorName}</strong>
            ${authorRole ? `<span>${authorRole}</span>` : ""}
          </span>
        </div>
      </td>
      <td>
        <div class="cell-actions">
          ${
            post.status === "rascunho"
              ? `<button type="button" class="icon-btn icon-btn-publish js-publish" data-post-id="${id}"
                    aria-label="Publicar rascunho: ${title}" title="Publicar">
                  ${icon("i-megaphone")}
                </button>`
              : ""
          }
          ${
            post.status === "publicado"
              ? `<button type="button" class="icon-btn icon-btn-pin ${post.pinned ? "is-active" : ""} js-pin" data-post-id="${id}"
                    aria-label="${post.pinned ? `Desfixar: ${title}` : `Fixar: ${title}`}" title="${post.pinned ? "Desfixar" : "Fixar"}">
                  ${icon("i-pin")}
                </button>`
              : ""
          }
          <a class="icon-btn" href="#/posts/${id}/editar"
             aria-label="Editar comunicado: ${title}" title="Editar">
            ${icon("i-edit")}
          </a>
          <button type="button" class="icon-btn icon-btn-danger js-delete" data-post-id="${id}"
                  aria-label="Excluir comunicado: ${title}" title="Excluir">
            ${icon("i-trash")}
          </button>
        </div>
      </td>
    </tr>`;
}

export function groupRowHTML(group) {
  const id = escapeHTML(group.id);
  const name = escapeHTML(group.name);
  return `
    <tr data-group-id="${id}">
      <td class="cell-post">
        <div class="cell-title">
          <span class="cell-title-text">${name}</span>
        </div>
      </td>
      <td>
        ${
          group.active
            ? '<span class="badge badge-status-active">Ativo</span>'
            : '<span class="badge badge-status-inactive">Inativo</span>'
        }
      </td>
      <td>
        <div class="cell-actions">
          <a class="icon-btn" href="#/groups/${id}/editar"
             aria-label="Editar grupo: ${name}" title="Editar">
            ${icon("i-edit")}
          </a>
          <button type="button" class="btn btn-ghost js-toggle-active" data-group-id="${id}">
            ${group.active ? "Desativar" : "Ativar"}
          </button>
        </div>
      </td>
    </tr>`;
}

export function emptyStateHTML({
  title,
  message,
  showCta = false,
  ctaHref = "#/posts/nova",
  ctaLabel = "Criar primeiro comunicado",
}) {
  return `
    <div class="empty-state">
      <span class="empty-state-icon" aria-hidden="true">${icon("i-inbox", 28)}</span>
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(message)}</p>
      ${
        showCta
          ? `<a class="btn btn-primary" href="${ctaHref}">${icon("i-plus")}<span>${escapeHTML(ctaLabel)}</span></a>`
          : ""
      }
    </div>`;
}

export function confirmModalHTML({ postTitle }) {
  return `
    <div class="modal-overlay js-modal-overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"
           aria-describedby="modal-desc">
        <span class="modal-icon" aria-hidden="true">${icon("i-alert", 22)}</span>
        <h2 id="modal-title">Excluir comunicado</h2>
        <p id="modal-desc">
          Tem certeza que deseja excluir <strong>“${escapeHTML(postTitle)}”</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost js-modal-cancel">Cancelar</button>
          <button type="button" class="btn btn-danger js-modal-confirm">
            ${icon("i-trash")}<span>Excluir</span>
          </button>
        </div>
      </div>
    </div>`;
}

export function sendConfirmModalHTML({ title, recipientCount, isBroadcast, scheduledAt }) {
  const isScheduled = Boolean(scheduledAt);
  const whenLabel = isScheduled
    ? new Date(scheduledAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return `
    <div class="modal-overlay js-modal-overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"
           aria-describedby="modal-desc">
        <span class="modal-icon ${isBroadcast ? "modal-icon-broadcast" : "modal-icon-send"}"
              aria-hidden="true">${icon(isBroadcast ? "i-alert" : "i-users", 22)}</span>
        <h2 id="modal-title">${isScheduled ? "Agendar publicação?" : isBroadcast ? "Enviar para todos?" : "Confirmar envio"}</h2>
        <p id="modal-desc">
          ${
            isScheduled
              ? `Este comunicado será liberado para <strong>${
                  isBroadcast ? `TODOS os ${recipientCount}` : `${recipientCount}`
                } colaboradores</strong> em <strong>${whenLabel}</strong>. Não será preciso nenhuma ação manual. Confirmar o agendamento?`
              : isBroadcast
                ? `Este comunicado será enviado a <strong>TODOS os ${recipientCount} colaboradores</strong>. Esta ação não pode ser desfeita. Confirmar envio?`
                : `Este comunicado será enviado a <strong>${recipientCount} colaboradores</strong> dos grupos selecionados. Confirmar envio?`
          }
        </p>
        <p class="modal-post-title">“${escapeHTML(title)}”</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost js-modal-cancel">Cancelar</button>
          <button type="button" class="btn btn-primary js-modal-confirm">
            ${icon(isScheduled ? "i-alert" : "i-megaphone")}<span>${
              isScheduled ? "Agendar publicação" : "Confirmar envio"
            }</span>
          </button>
        </div>
      </div>
    </div>`;
}

export function spinnerHTML(label) {
  return `<span class="spinner" aria-hidden="true"></span><span>${escapeHTML(label)}</span>`;
}
