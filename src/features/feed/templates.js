import { escapeHTML, relativeDate, initialsOf } from "../../core/utils.js";
import { getCategoryLabel } from "../../data/posts.js";

function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentsListHTML(attachments, postId) {
  const list = attachments || [];
  if (list.length === 0) return "";
  return `
    <ul class="attachment-list">
      ${list
        .map(
          (a) => `
        <li class="attachment-item">
          <button type="button" class="attachment-link js-save-attachment"
                  data-post-id="${escapeHTML(postId)}"
                  data-attachment-id="${escapeHTML(a.id)}"
                  aria-label="Baixar anexo ${escapeHTML(a.name || "anexo")}">
            <svg width="18" height="18" aria-hidden="true"><use href="#i-download"/></svg>
            <span class="attachment-name">${escapeHTML(a.name || "—")}</span>
            <span class="attachment-meta">${escapeHTML(formatFileSize(a.size))}</span>
          </button>
        </li>`
        )
        .join("")}
    </ul>`;
}

export function actionButtonsHTML(post, { liked, read }) {
  const needsAck = post.readMode === "ack";
  return `
    <div class="post-actions">
      <button type="button" class="action-btn js-like ${liked ? "is-liked" : ""}"
              data-post-id="${post.id}" aria-pressed="${liked}"
              aria-label="${liked ? "Descurtir" : "Curtir"} comunicado">
        <svg width="18" height="18" aria-hidden="true"><use href="#i-heart"/></svg>
        <span class="like-count">${post.likeBase + (liked ? 1 : 0)}</span>
      </button>
      ${needsAck ? `
      <button type="button" class="action-btn js-read ${read ? "is-read" : ""}"
              data-post-id="${post.id}" ${read ? "disabled" : ""}
              aria-label="Confirmar leitura do comunicado">
        <svg width="18" height="18" aria-hidden="true"><use href="#i-check"/></svg>
        <span>${read ? "Leitura confirmada" : "Confirmar leitura"}</span>
      </button>` : ""}
      ${read ? `
      <button type="button" class="action-btn js-unread" data-post-id="${post.id}"
              aria-label="Marcar como não lido">
        <svg width="18" height="18" aria-hidden="true"><use href="#i-x"/></svg>
        <span>Marcar como não lido</span>
      </button>` : ""}
    </div>`;
}

export function postCardHTML(post, { liked, read }) {
  const author = escapeHTML(post.author?.name || "—");
  return `
    <li class="post-card" data-post-id="${post.id}">
      <div class="post-meta-row">
        <span class="unread-dot" ${read ? "hidden" : ""} aria-hidden="true"></span>
        <span class="badge" data-cat="${post.categoryId}">${getCategoryLabel(post.categoryId)}</span>
        ${post.pinned ? '<span class="badge badge-pinned"><svg width="11" height="11" aria-hidden="true" focusable="false"><use href="#i-pin"/></svg> Fixado</span>' : ""}
        ${post.urgent ? '<span class="badge badge-urgent">Urgente</span>' : ""}
        ${post.targetGroups?.length ? '<span class="badge badge-targeted">Direcionado</span>' : ""}
        <time class="post-time">${relativeDate(post.dateISO)}</time>
      </div>
      <button type="button" class="js-open-post"
              style="all:unset;display:block;width:100%;cursor:pointer"
              data-post-id="${post.id}" aria-label="Abrir comunicado: ${escapeHTML(post.title)}">
        <h2 class="post-title">${escapeHTML(post.title)}</h2>
      </button>
      <p class="post-excerpt">${escapeHTML(post.body.join(" "))}</p>
      <div class="post-footer">
        <span class="post-author">
          <span class="avatar avatar-sm" aria-hidden="true">${initialsOf(post.author?.name || "")}</span>
          <span class="post-author-name">${author}</span>
        </span>
        ${actionButtonsHTML(post, { liked, read })}
      </div>
    </li>`;
}
