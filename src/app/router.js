import { state } from "../core/state.js";
import { $ } from "../core/utils.js";
import { shellHTML } from "../ui/templates.js";
import { logout } from "../features/auth/session.js";
import { showToast } from "../ui/toast.js";
import * as loginView from "../features/auth/login-view.js";
import * as postsListView from "../features/posts/list-view.js";
import * as postFormView from "../features/posts/form-view.js";
import * as groupsListView from "../features/groups/list-view.js";
import * as groupFormView from "../features/groups/form-view.js";
import * as analyticsListView from "../features/analytics/list-view.js";
import * as analyticsDetailView from "../features/analytics/detail-view.js";
import * as dashboardView from "../features/analytics/dashboard-view.js";
import * as emailProviderView from "../features/settings/email-provider-view.js";

function parseRoute() {
  const parts = location.hash.replace(/^#/, "").split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "login" && parts.length === 1) return { name: "login" };
  if (parts[0] === "posts" && parts.length === 1) return { name: "posts" };
  if (parts[0] === "posts" && parts[1] === "nova" && parts.length === 2)
    return { name: "post-new" };
  if (parts[0] === "posts" && parts.length === 3 && parts[2] === "editar")
    return { name: "post-edit", id: parts[1] };
  if (parts[0] === "groups" && parts.length === 1) return { name: "groups" };
  if (parts[0] === "groups" && parts[1] === "nova" && parts.length === 2)
    return { name: "group-new" };
  if (parts[0] === "groups" && parts.length === 3 && parts[2] === "editar")
    return { name: "group-edit", id: parts[1] };
  if (parts[0] === "analytics" && parts.length === 1) return { name: "analytics" };
  if (parts[0] === "analytics" && parts.length === 2)
    return { name: "analytics-detail", id: parts[1] };
  if (parts[0] === "dashboard" && parts.length === 1) return { name: "dashboard" };
  if (parts[0] === "settings" && parts[1] === "email-provider" && parts.length === 2)
    return { name: "email-provider" };
  return { name: "not-found" };
}

const AUTH_ROUTES = {
  posts: {
    title: "Comunicados",
    active: "posts",
    render: (view) => postsListView.render(view),
  },
  "post-new": {
    title: "Nova publicação",
    active: "posts",
    render: (view) => postFormView.render(view),
  },
  "post-edit": {
    title: "Editar publicação",
    active: "posts",
    render: (view, route) => postFormView.render(view, { id: route.id }),
  },
  groups: {
    title: "Grupos",
    active: "groups",
    render: (view) => groupsListView.render(view),
  },
  "group-new": {
    title: "Novo grupo",
    active: "groups",
    render: (view) => groupFormView.render(view),
  },
  "group-edit": {
    title: "Editar grupo",
    active: "groups",
    render: (view, route) => groupFormView.render(view, { id: route.id }),
  },
  analytics: {
    title: "Leituras",
    active: "analytics",
    render: (view) => analyticsListView.render(view),
  },
  "analytics-detail": {
    title: "Detalhes de leitura",
    active: "analytics",
    render: (view, route) => {
      analyticsDetailView.resetGroupFilter();
      analyticsDetailView.render(view, { id: route.id });
    },
  },
  dashboard: {
    title: "Dashboard",
    active: "dashboard",
    render: (view) => dashboardView.render(view),
  },
  "email-provider": {
    title: "Provedor de e-mail",
    active: "settings",
    render: (view) => emailProviderView.render(view),
  },
};

function renderRoute() {
  analyticsDetailView.stopPolling();

  const route = parseRoute();
  const authed = Boolean(state.user);

  if (route.name === "home" || route.name === "not-found") {
    location.replace(authed ? "#/posts" : "#/login");
    return;
  }
  if (!authed && route.name !== "login") {
    location.replace("#/login");
    return;
  }
  if (authed && route.name === "login") {
    location.replace("#/posts");
    return;
  }

  const app = $("#app");

  if (route.name === "login") {
    document.title = "Entrar — Interact Admin";
    loginView.render(app);
    return;
  }

  const config = AUTH_ROUTES[route.name];

  // A tela de gestão do provedor de e-mail é restrita a admin (MT-28).
  if (route.name === "email-provider" && state.user?.role !== "admin") {
    location.replace("#/posts");
    return;
  }

  document.title = `${config.title} — Interact Admin`;
  app.innerHTML = shellHTML({
    user: state.user,
    sectionTitle: config.title,
    active: config.active,
  });
  $(".js-logout").addEventListener("click", () => {
    logout();
    location.replace("#/login");
    showToast("Sessão encerrada");
  });
  const view = $("#view");
  config.render(view, route);
}

export function initRouter() {
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}
