import { registerSW } from "virtual:pwa-register";
import { state } from "../../core/state.js";
import { getTenantSlug } from "../../core/tenant.js";
import { $, dismissInstallKey, storageGet, storageSet } from "../../core/utils.js";
import { showToast } from "../../ui/toast.js";

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function maybeShowInstallBanner() {
  if (storageGet(dismissInstallKey(), false)) return;
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
  storageSet(dismissInstallKey(), true);
}

/* Manifest por tenant (MT-26): injeta um manifest.webmanifest (Blob) com nome/scope
   do tenant antes do registerSW — o SW permanece por origem/scope (isolamento por subdomínio). */
export function applyTenantManifest() {
  const slug = getTenantSlug();
  const manifest = {
    name: `Interact — ${slug}`,
    short_name: "Interact",
    description: "Comunicação interna entre empresa e colaboradores",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    dir: "ltr",
    theme_color: "#0F2B52",
    background_color: "#F4F7FB",
    categories: ["business", "productivity"],
    icons: [
      { src: "/assets/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/assets/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = URL.createObjectURL(blob);
  document.head.appendChild(link);
}

export function initPWA() {
  applyTenantManifest();
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
