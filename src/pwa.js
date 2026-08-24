import { registerSW } from "virtual:pwa-register";
import { state } from "./state.js";
import { $, STORAGE_KEYS, storageGet, storageSet } from "./utils.js";
import { showToast } from "./toast.js";

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function maybeShowInstallBanner() {
  if (storageGet(STORAGE_KEYS.dismissInstall, false)) return;
  if (state.deferredPrompt) {
    $("#install-hint").textContent =
      "Acesso rápido direto da sua tela inicial.";
  } else if (isIOS() && !navigator.standalone) {
    $("#install-hint").textContent =
      "Toque em Compartilhar e depois em “Adicionar à Tela de Início”.";
  } else {
    return;
  }
  $("#install-banner").hidden = false;
}

async function handleInstallClick() {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice.catch(() => null);
  state.deferredPrompt = null;
  $("#install-banner").hidden = true;
}

function dismissInstallBanner() {
  $("#install-banner").hidden = true;
  storageSet(STORAGE_KEYS.dismissInstall, true);
}

export function initPWA() {
  registerSW({ immediate: true });

  $("#btn-install").addEventListener("click", handleInstallClick);
  $("#btn-install-dismiss").addEventListener("click", dismissInstallBanner);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    maybeShowInstallBanner();
  });
  window.addEventListener("appinstalled", () => {
    $("#install-banner").hidden = true;
    showToast("Interact instalado");
  });

  maybeShowInstallBanner();
}
