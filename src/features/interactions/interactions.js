import { state } from "../../core/state.js";
import { $, REDUCED_MOTION } from "../../core/utils.js";
import { getPostById } from "../../data/posts.js";
import { toggleLikePersist, markReadPersist, getUserData } from "../auth/session.js";
import { actionButtonsHTML } from "../feed/templates.js";
import { showToast } from "../../ui/toast.js";

export function toggleLike(postId) {
  const nowLiked = toggleLikePersist(postId);

  for (const btn of document.querySelectorAll(
    `.js-like[data-post-id="${postId}"]`
  )) {
    btn.classList.toggle("is-liked", nowLiked);
    btn.setAttribute("aria-pressed", String(nowLiked));
    btn.setAttribute(
      "aria-label",
      nowLiked ? "Descurtir comunicado" : "Curtir comunicado"
    );
    const count = btn.querySelector(".like-count");
    const post = getPostById(postId);
    count.textContent = post.likeBase + (nowLiked ? 1 : 0);

    if (nowLiked && !REDUCED_MOTION.matches && btn.animate) {
      btn.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.25)" },
          { transform: "scale(1)" },
        ],
        { duration: 280, easing: "cubic-bezier(.34,1.3,.64,1)" }
      );
    }
  }
}

export function confirmReading(postId) {
  const wasUnread = markReadPersist(postId);
  syncPostUI(postId);
  if (wasUnread) showToast("Leitura confirmada");
}

export function syncPostUI(postId) {
  const post = getPostById(postId);
  const userData = getUserData();
  for (const card of document.querySelectorAll(
    `.post-card[data-post-id="${postId}"]`
  )) {
    const dot = card.querySelector(".unread-dot");
    if (dot) dot.hidden = true;
    const footerActions = card.querySelector(".post-footer .post-actions");
    if (footerActions) {
      footerActions.outerHTML = actionButtonsHTML(post, {
        liked: userData.likes.includes(postId),
        read: true,
      });
    }
  }
  const sheetActions = $("#sheet-actions");
  if (!$("#sheet").hidden && sheetActions.dataset.postId === postId) {
    sheetActions.innerHTML = actionButtonsHTML(post, {
      liked: userData.likes.includes(postId),
      read: true,
    });
  }
}

export function bindActionContainer(root, { onOpen } = {}) {
  root.addEventListener("click", (event) => {
    const likeBtn = event.target.closest(".js-like");
    const readBtn = event.target.closest(".js-read");
    const openBtn = event.target.closest(".js-open-post");
    if (likeBtn) toggleLike(likeBtn.dataset.postId);
    else if (readBtn) confirmReading(readBtn.dataset.postId);
    else if (openBtn && onOpen) onOpen(openBtn.dataset.postId);
  });
}
