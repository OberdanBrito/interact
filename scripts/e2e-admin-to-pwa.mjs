import { createRequire } from "module";
import path from "node:path";
const require = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = require("playwright-core");

const PWA_URL = process.env.PWA_URL ?? "http://localhost:5173/";
const API = process.env.API_URL ?? "http://localhost:3002";
const ADMIN = { email: "admin@interactcorp.com.br", password: "senha123" };

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch({
  executablePath: process.env.QA_CHROME ?? "/usr/bin/google-chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

// Cria um comunicado via backend (ação do admin) usando a API real
async function createPostViaAdmin() {
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ADMIN),
  });
  if (!loginRes.ok) throw new Error(`login admin falhou: ${loginRes.status}`);
  const { token } = await loginRes.json();

  const title = `E2E Playwright ${Date.now()}`;
  const res = await fetch(`${API}/api/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      categoryId: "rh",
      urgent: true,
      body: ["Post criado pelo admin via API no teste E2E."],
      author: { name: "Atlas QA", role: "Teste Automatizado" },
    }),
  });
  if (!res.ok) throw new Error(`criação falhou: ${res.status}`);
  const created = await res.json();
  return { title, id: created.id };
}

try {
  // 1. PWA abre no login
  await page.goto(PWA_URL, { waitUntil: "load" });
  await page.waitForTimeout(600);
  check(
    "PWA abre na tela de login",
    await page.evaluate(() => !document.querySelector("#view-login").hidden)
  );

  // 2. Login como admin (backend real)
  await page.fill("#login-email", ADMIN.email);
  await page.fill("#login-pass", ADMIN.password);
  await page.click("#btn-login");
  await page.waitForSelector(".post-card", { timeout: 8000 });
  const initialCards = await page.evaluate(
    () => document.querySelectorAll(".post-card").length
  );
  check("feed carrega posts do backend", initialCards >= 10, `cards=${initialCards}`);

  // 3. Admin envia um dado (via API do backend)
  const { title, id } = await createPostViaAdmin();
  check("admin criou comunicado no backend", !!id, `id=${id}`);

  // 4. PWA reflete o dado enviado pelo admin
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".post-card", { timeout: 8000 });
  // espera o card com o título aparecer
  await page.waitForFunction(
    (t) =>
      [...document.querySelectorAll(".post-card .post-title")].some((e) =>
        e.textContent.includes(t)
      ),
    title,
    { timeout: 8000 }
  );
  const appeared = await page.evaluate((t) => {
    const card = [...document.querySelectorAll(".post-card")].find((c) =>
      c.querySelector(".post-title")?.textContent.includes(t)
    );
    return {
      found: !!card,
      urgent: !!card?.querySelector(".badge-urgent"),
      first: card === document.querySelector(".post-card"),
    };
  }, title);
  check("PWA exibe o comunicado enviado pelo admin", appeared.found, title);
  check("card marcado como urgente", appeared.urgent === true);
  check("comunicado novo aparece no topo do feed", appeared.first === true);

  // 5. Sem erros de console
  check("console sem erros", consoleErrors.length === 0, `${consoleErrors.length} erros`);
} catch (err) {
  check("fluxo sem exceções", false, String(err).slice(0, 200));
}

const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
await browser.close();
process.exit(failed.length ? 1 : 0);
