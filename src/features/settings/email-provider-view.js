import { getEmailProvider, updateEmailProvider, testEmailProvider } from "../../data/email-provider.js";
import { escapeHTML } from "../../core/utils.js";
import { spinnerHTML } from "../../ui/templates.js";
import { showToast } from "../../ui/toast.js";

function errorId(id) {
  return `f-${id}-error`;
}

function showError(input, message) {
  const error = document.getElementById(errorId(input.dataset.field));
  input.classList.add("has-error");
  input.setAttribute("aria-invalid", "true");
  error.textContent = message;
  error.hidden = false;
}

function clearErrors(root) {
  root.querySelectorAll(".has-error").forEach((el) => {
    el.classList.remove("has-error");
    el.removeAttribute("aria-invalid");
  });
  root.querySelectorAll(".field-error").forEach((el) => {
    el.hidden = true;
  });
}

function collectPayload(root) {
  const type = root.querySelector('[name="type"]').value;
  const host = root.querySelector('[name="host"]').value.trim();
  const port = root.querySelector('[name="port"]').value.trim();
  const secure = root.querySelector('[name="secure"]').checked;
  const authUser = root.querySelector('[name="authUser"]').value.trim();
  const secret = root.querySelector('[name="secret"]').value;
  const fromAddress = root.querySelector('[name="fromAddress"]').value.trim();
  const fromName = root.querySelector('[name="fromName"]').value.trim();
  return { type, host, port: Number(port), secure, authUser, secret, fromAddress, fromName };
}

export async function render(root) {
  const { provider } = await getEmailProvider();
  const configured = Boolean(provider?.configured);
  const p = provider || {};

  root.innerHTML = `
    <a class="back-link" href="#/posts">
      <svg width="16" height="16" aria-hidden="true" focusable="false"><use href="#i-arrow-left"/></svg>
      Voltar para a lista
    </a>

    <form class="card form-card" id="email-provider-form" novalidate>
      <div class="field">
        <label class="field-label" for="f-type">Tipo de provedor</label>
        <select class="input" id="f-type" name="type" aria-describedby="${errorId("type")}">
          <option value="smtp" ${p.type === "smtp" ? "selected" : ""}>SMTP</option>
          <option value="api" ${p.type === "api" ? "selected" : ""}>API de terceiro</option>
        </select>
        <p class="field-error" id="${errorId("type")}" hidden></p>
      </div>

      <div class="field">
        <label class="field-label" for="f-host">Host</label>
        <input class="input" id="f-host" name="host" type="text" maxlength="200"
               placeholder="Ex.: smtp.gmail.com"
               value="${escapeHTML(p.host || "")}"
               aria-describedby="${errorId("host")}">
        <p class="field-error" id="${errorId("host")}" hidden></p>
      </div>

      <div class="field">
        <label class="field-label" for="f-port">Porta</label>
        <input class="input" id="f-port" name="port" type="number" min="1" max="65535"
               placeholder="587" value="${escapeHTML(p.port ?? "")}"
               aria-describedby="${errorId("port")}">
        <p class="field-error" id="${errorId("port")}" hidden></p>
      </div>

      <div class="field">
        <span class="field-label" id="secure-label">Conexão segura</span>
        <label class="toggle">
          <input type="checkbox" id="f-secure" name="secure" ${p.secure ? "checked" : ""}>
          <span class="toggle-track" aria-hidden="true"></span>
          <span class="toggle-text">
            <strong>Conexão segura (TLS/SSL)</strong>
            <span>Marque para portas TLS (ex.: 465).</span>
          </span>
        </label>
      </div>

      <div class="field">
        <label class="field-label" for="f-authUser">Usuário</label>
        <input class="input" id="f-authUser" name="authUser" type="text" maxlength="200"
               placeholder="Ex.: no-reply@empresa.com"
               value="${escapeHTML(p.authUser || "")}"
               aria-describedby="${errorId("authUser")}">
        <p class="field-error" id="${errorId("authUser")}" hidden></p>
      </div>

      <div class="field">
        <label class="field-label" for="f-secret">Segredo</label>
        <input class="input" id="f-secret" name="secret" type="password" maxlength="300"
               placeholder="${configured ? "•••• (configurado)" : "Senha ou API key"}"
               aria-describedby="${errorId("secret")}">
        <p class="field-error" id="${errorId("secret")}" hidden></p>
        <p class="field-hint">${configured ? "Deixe em branco para manter a credencial atual." : ""}</p>
      </div>

      <div class="field">
        <label class="field-label" for="f-fromAddress">Remetente (e-mail)</label>
        <input class="input" id="f-fromAddress" name="fromAddress" type="email" maxlength="200"
               placeholder="Ex.: comunicados@empresa.com"
               value="${escapeHTML(p.fromAddress || "")}"
               aria-describedby="${errorId("fromAddress")}">
        <p class="field-error" id="${errorId("fromAddress")}" hidden></p>
      </div>

      <div class="field">
        <label class="field-label" for="f-fromName">Remetente (nome)</label>
        <input class="input" id="f-fromName" name="fromName" type="text" maxlength="120"
               placeholder="Ex.: Interact"
               value="${escapeHTML(p.fromName || "")}"
               aria-describedby="${errorId("fromName")}">
        <p class="field-error" id="${errorId("fromName")}" hidden></p>
      </div>

      <p class="field-error" id="f-test-msg" hidden></p>
      <p class="field-hint" id="audit-line" hidden></p>

      <div class="form-actions">
        <a class="btn btn-ghost" href="#/posts">Cancelar</a>
        <button type="button" class="btn btn-ghost" id="btn-test">Testar conexão</button>
        <button class="btn btn-primary" id="form-submit" type="submit">
          <span>Salvar configuração</span>
        </button>
      </div>
    </form>`;

  const form = root.querySelector("#email-provider-form");
  const submit = root.querySelector("#form-submit");
  const testBtn = root.querySelector("#btn-test");
  const testMsg = root.querySelector("#f-test-msg");
  const auditLine = root.querySelector("#audit-line");
  let testedOk = false;

  if (configured) {
    const byName = p.updatedBy ? "por você" : "";
    const when = p.updatedAt
      ? new Date(p.updatedAt).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    auditLine.textContent = `Última atualização ${byName ? byName + " " : ""}em ${when}`.trim();
    auditLine.hidden = false;
  }

  form.addEventListener("input", (event) => {
    const field = event.target.closest("[data-field]");
    if (field && field.classList.contains("has-error")) {
      field.classList.remove("has-error");
      field.removeAttribute("aria-invalid");
      document.getElementById(errorId(field.dataset.field)).hidden = true;
    }
    testMsg.hidden = true;
    testedOk = false;
  });

  function validate() {
    clearErrors(root);
    const payload = collectPayload(root);
    let valid = true;
    const host = root.querySelector('[name="host"]');
    const port = root.querySelector('[name="port"]');
    const authUser = root.querySelector('[name="authUser"]');
    const fromAddress = root.querySelector('[name="fromAddress"]');
    const fromName = root.querySelector('[name="fromName"]');
    if (!payload.host) { showError(host, "Informe o host."); valid = false; }
    if (!payload.port || payload.port < 1 || payload.port > 65535) { showError(port, "Informe uma porta válida."); valid = false; }
    if (!payload.authUser) { showError(authUser, "Informe o usuário."); valid = false; }
    if (!payload.fromAddress) { showError(fromAddress, "Informe o e-mail do remetente."); valid = false; }
    if (!payload.fromName) { showError(fromName, "Informe o nome do remetente."); valid = false; }
    if (!payload.secret && !configured) { showError(root.querySelector('[name="secret"]'), "Informe o segredo."); valid = false; }
    return { valid, payload };
  }

  testBtn.addEventListener("click", async () => {
    const { valid, payload } = validate();
    if (!valid) return;
    testBtn.disabled = true;
    testBtn.classList.add("is-loading");
    testBtn.innerHTML = spinnerHTML("Testando…");
    const result = await testEmailProvider(payload);
    testBtn.disabled = false;
    testBtn.classList.remove("is-loading");
    testBtn.innerHTML = "<span>Testar conexão</span>";
    testMsg.hidden = false;
    if (result.ok) {
      testedOk = true;
      testMsg.classList.remove("has-error");
      testMsg.textContent = "✓ Conexão validada.";
    } else {
      testedOk = false;
      testMsg.classList.add("has-error");
      testMsg.textContent = "✗ Falha na conexão: " + (result.error || "verifique os dados.");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const { valid, payload } = validate();
    if (!valid) return;

    if (!testedOk) {
      const proceed = window.confirm(
        "Você ainda não testou a conexão com sucesso. Deseja salvar mesmo assim?"
      );
      if (!proceed) return;
    }

    submit.disabled = true;
    submit.classList.add("is-loading");
    submit.innerHTML = spinnerHTML("Salvando…");

    try {
      await updateEmailProvider(payload);
      showToast("Provedor de e-mail salvo com sucesso");
      location.hash = "#/posts";
    } catch (err) {
      submit.disabled = false;
      submit.classList.remove("is-loading");
      submit.innerHTML = "<span>Salvar configuração</span>";
      showToast("Erro ao salvar: " + err.message);
    }
  });
}
