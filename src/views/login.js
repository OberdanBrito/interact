import { login } from "../session.js";
import { showToast } from "../toast.js";
import { spinnerHTML } from "../templates.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldErrorId(field) {
  return `${field.id}-error`;
}

function showFieldError(field, message) {
  const error = document.getElementById(fieldErrorId(field));
  field.classList.add("has-error");
  field.setAttribute("aria-invalid", "true");
  error.textContent = message;
  error.hidden = false;
}

function clearFieldError(field) {
  const error = document.getElementById(fieldErrorId(field));
  field.classList.remove("has-error");
  field.removeAttribute("aria-invalid");
  error.hidden = true;
}

export function render(root) {
  root.innerHTML = `
    <div class="login">
      <aside class="login-brand">
        <div class="login-brand-inner">
          <span class="brand-mark brand-mark-lg" aria-hidden="true">I</span>
          <h1>Interact Admin</h1>
          <p class="login-tagline">Comunicação interna, sob seu controle.</p>
          <p class="login-copy">Publique comunicados, gerencie categorias e acompanhe
          o que chega aos colaboradores pelo app Interact.</p>
        </div>
      </aside>
      <main class="login-panel">
        <form class="login-card" id="login-form" novalidate>
          <h2>Entrar no painel</h2>
          <p class="login-hint">Acesso restrito à equipe de comunicação.</p>

          <p class="form-alert" id="login-alert" role="alert" hidden></p>

          <div class="field">
            <label class="field-label" for="login-email">E-mail corporativo</label>
            <input class="input" id="login-email" name="email" type="email"
                   autocomplete="email" placeholder="voce@interactcorp.com"
                   aria-describedby="login-email-error">
            <p class="field-error" id="login-email-error" hidden></p>
          </div>

          <div class="field">
            <label class="field-label" for="login-password">Senha</label>
            <input class="input" id="login-password" name="password" type="password"
                   autocomplete="current-password" placeholder="Mínimo de 6 caracteres"
                   aria-describedby="login-password-error">
            <p class="field-error" id="login-password-error" hidden></p>
          </div>

          <button class="btn btn-primary btn-block btn-lg" id="login-submit" type="submit">
            <span>Entrar</span>
          </button>
        </form>
      </main>
    </div>`;

  const form = root.querySelector("#login-form");
  const email = root.querySelector("#login-email");
  const password = root.querySelector("#login-password");
  const alert = root.querySelector("#login-alert");
  const submit = root.querySelector("#login-submit");

  email.addEventListener("input", () => clearFieldError(email));
  password.addEventListener("input", () => clearFieldError(password));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    alert.hidden = true;

    let firstInvalid = null;
    if (!EMAIL_RE.test(email.value.trim())) {
      showFieldError(email, "Informe um e-mail válido.");
      firstInvalid = firstInvalid || email;
    }
    if (password.value.length < 6) {
      showFieldError(password, "A senha deve ter pelo menos 6 caracteres.");
      firstInvalid = firstInvalid || password;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    submit.disabled = true;
    submit.classList.add("is-loading");
    submit.innerHTML = spinnerHTML("Entrando…");

    try {
      const user = await login(email.value.trim(), password.value);
      location.replace("#/posts");
      showToast(`Bem-vindo(a), ${user.name.split(" ")[0]}`);
    } catch (err) {
      alert.textContent = err.message;
      alert.hidden = false;
      submit.disabled = false;
      submit.classList.remove("is-loading");
      submit.innerHTML = "<span>Entrar</span>";
    }
  });

  email.focus();
}
