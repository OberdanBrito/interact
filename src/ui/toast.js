import { state } from "../core/state.js";

export function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(hideToast, 2400);
}

export function hideToast() {
  const toast = document.querySelector("#toast");
  clearTimeout(state.toastTimer);
  if (toast.hidden) return;
  toast.classList.remove("is-visible");
  setTimeout(() => {
    toast.hidden = true;
  }, 220);
}
