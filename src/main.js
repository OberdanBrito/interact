import { state } from "./state.js";
import { $, initialsOf } from "./utils.js";
import { restoreSession, login, logout, getCurrentUser } from "./session.js";
import { renderChips, renderFeed, resetFilter } from "./feed.js";
import {
  bindActionContainer,
  toggleLike,
  confirmReading,
} from "./interactions.js";
import {
  openSheet,
  closeSheet,
  trapSheetFocus,
} from "./sheet.js";
import { handleSheetScroll } from "./autoread.js";
import { hideToast } from "./toast.js";
import { initPWA } from "./pwa.js";

function showView(view) {
  $("#view-login").hidden = view !== "login";
  $("#view-feed").hidden = view !== "feed";
}

function enterFeed() {
  renderChips();
  renderFeed();
  const user = getCurrentUser();
  $("#user-initials").textContent = initialsOf(user.name);
  $("#user-avatar").setAttribute("aria-label", `Conta de ${user.name}`);
  showView("feed");
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const emailInput = $("#login-email");
  const passInput = $("#login-pass");
  const errEmail = $("#err-email");
  const errPass = $("#err-pass");
  const button = $("#btn-login");
  const label = button.querySelector(".btn-label");
  const spinner = button.querySelector(".spinner");

  errEmail.hidden = true;
  errPass.hidden = true;
  emailInput.removeAttribute("aria-invalid");
  passInput.removeAttribute("aria-invalid");

  const email = emailInput.value.trim();
  const password = passInput.value;

  let hasError = false;
  if (!email) {
    errEmail.textContent = "Informe seu e-mail corporativo.";
    errEmail.hidden = false;
    emailInput.setAttribute("aria-invalid", "true");
    hasError = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEmail.textContent =
      "Digite um e-mail válido, como nome@empresa.com.br.";
    errEmail.hidden = false;
    emailInput.setAttribute("aria-invalid", "true");
    hasError = true;
  }
  if (!password || password.length < 6) {
    errPass.textContent = "A senha precisa ter pelo menos 6 caracteres.";
    errPass.hidden = false;
    passInput.setAttribute("aria-invalid", "true");
    hasError = true;
  }
  if (hasError) return;

  button.disabled = true;
  label.hidden = true;
  spinner.hidden = false;

  try {
    await login(email, password);
    form.reset();
    enterFeed();
  } catch (err) {
    errPass.textContent = err.message;
    errPass.hidden = false;
    passInput.setAttribute("aria-invalid", "true");
  } finally {
    button.disabled = false;
    label.hidden = false;
    spinner.hidden = true;
  }
}

function handleLogout() {
  logout();
  resetFilter();
  closeSheet(true);
  hideToast();
  showView("login");
  $("#login-pass").value = "";
}

function init() {
  $("#login-form").addEventListener("submit", handleLogin);
  $("#btn-logout").addEventListener("click", handleLogout);

  bindActionContainer($("#post-list"), { onOpen: openSheet });
  bindActionContainer($("#sheet-actions"));

  $("#sheet-close").addEventListener("click", () => closeSheet());
  $("#sheet-backdrop").addEventListener("click", () => closeSheet());
  $(".sheet-body").addEventListener(
    "scroll",
    handleSheetScroll,
    { passive: true }
  );
  document.addEventListener("keydown", (event) => {
    if (!$("#sheet").hidden) trapSheetFocus(event);
  });

  initPWA();

  if (restoreSession()) enterFeed();
  else showView("login");
}

init();
