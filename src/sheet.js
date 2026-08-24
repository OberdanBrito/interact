import { state } from "./state.js";
import {
  $,
  REDUCED_MOTION,
  escapeHTML,
  relativeDate,
  initialsOf,
} from "./utils.js";
import { getPostById, getCategoryLabel } from "./data.js";
import { getUserData } from "./session.js";
import { actionButtonsHTML } from "./templates.js";
import { cancelAutoRead, scheduleAutoRead } from "./autoread.js";

function currentActionsHTML(post) {
  const userData = getUserData();
  return actionButtonsHTML(post, {
    liked: userData.likes.includes(post.id),
    read: userData.read.includes(post.id),
  });
}

export function openSheet(postId) {
  const post = getPostById(postId);
  if (!post) return;

  state.sheetEpoch++;
  state.sheetRestoreFocus = document.activeElement;
  state.sheetPostId = postId;
  cancelAutoRead();

  $("#sheet-cat").dataset.cat = post.categoryId;
  $("#sheet-cat").textContent = getCategoryLabel(post.categoryId);
  $("#sheet-urgent").hidden = !post.urgent;
  $("#sheet-date").textContent = relativeDate(post.dateISO);
  $("#sheet-title").textContent = post.title;
  $("#sheet-avatar").textContent = initialsOf(post.author.name);
  $("#sheet-author").textContent = `${post.author.name} · ${post.author.role}`;
  $("#sheet-text").innerHTML = post.body
    .map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`)
    .join("");

  const actions = $("#sheet-actions");
  actions.dataset.postId = postId;
  actions.innerHTML = currentActionsHTML(post);

  const root = $("#sheet");
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("is-open"));
  document.body.style.overflow = "hidden";

  if (post.readMode !== "ack") scheduleAutoRead();

  $("#sheet-close").focus();
}

export function closeSheet(silent = false) {
  const root = $("#sheet");
  if (root.hidden) return;
  root.classList.remove("is-open");
  document.body.style.overflow = "";

  const epoch = state.sheetEpoch;
  const finish = () => {
    // um openSheet posterior invalida este fechamento pendente
    if (epoch !== state.sheetEpoch || root.hidden) return;
    root.hidden = true;
    state.sheetPostId = null;
    cancelAutoRead();
    if (state.sheetRestoreFocus instanceof HTMLElement && !silent) {
      state.sheetRestoreFocus.focus();
    }
    state.sheetRestoreFocus = null;
  };
  if (REDUCED_MOTION.matches) finish();
  else setTimeout(finish, 220); // --dur-med
}

export function trapSheetFocus(event) {
  if (event.key === "Escape") {
    closeSheet();
    return;
  }
  if (event.key !== "Tab") return;
  const focusables = $("#sheet").querySelectorAll(
    'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
