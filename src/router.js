import { state } from "./state.js";
import { $ } from "./utils.js";
import { shellHTML } from "./templates.js";
import { logout } from "./session.js";
import { showToast } from "./toast.js";
import * as loginView from "./views/login.js";
import * as postsListView from "./views/posts-list.js";
import * as postFormView from "./views/post-form.js";

function parseRoute() {
  const parts = location.hash.replace(/^#/, "").split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "login" && parts.length === 1) return { name: "login" };
  if (parts[0] === "posts" && parts.length === 1) return { name: "posts" };
  if (parts[0] === "posts" && parts[1] === "nova" && parts.length === 2)
    return { name: "post-new" };
  if (parts[0] === "posts" && parts.length === 3 && parts[2] === "editar")
    return { name: "post-edit", id: parts[1] };
  return { name: "not-found" };
}

const AUTH_ROUTES = {
  posts: {
    title: "Comunicados",
    render: (view) => postsListView.render(view),
  },
  "post-new": {
    title: "Nova publicação",
    render: (view) => postFormView.render(view),
  },
  "post-edit": {
    title: "Editar publicação",
    render: (view, route) => postFormView.render(view, { id: route.id }),
  },
};

function renderRoute() {
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
  document.title = `${config.title} — Interact Admin`;
  app.innerHTML = shellHTML({
    user: state.user,
    sectionTitle: config.title,
    active: "posts",
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
