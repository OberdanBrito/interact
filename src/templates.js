import { escapeHTML, relativeDate, initialsOf } from "./utils.js";
import { getCategoryLabel } from "./data.js";

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
    </div>`;
}

export function postCardHTML(post, { liked, read }) {
  const author = escapeHTML(post.author.name);
  return `
    <li class="post-card" data-post-id="${post.id}">
      <div class="post-meta-row">
        <span class="unread-dot" ${read ? "hidden" : ""} aria-hidden="true"></span>
        <span class="badge" data-cat="${post.categoryId}">${getCategoryLabel(post.categoryId)}</span>
        ${post.urgent ? '<span class="badge badge-urgent">Urgente</span>' : ""}
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
          <span class="avatar avatar-sm" aria-hidden="true">${initialsOf(post.author.name)}</span>
          <span class="post-author-name">${author}</span>
        </span>
        ${actionButtonsHTML(post, { liked, read })}
      </div>
    </li>`;
}
