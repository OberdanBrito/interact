import { createRequire } from "module";
import path from "node:path";
const require = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = require("playwright-core");

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:5174/";
const PWA_URL = process.env.PWA_URL ?? "http://localhost:5173/";
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
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

const title = `Comunicado E2E ${Date.now()}`;

try {
  // ===== ADMIN: login =====
  await page.goto(ADMIN_URL, { waitUntil: "load" });
  await page.waitForSelector("#login-form", { timeout: 8000 });
  await page.fill("#login-email", ADMIN.email);
  await page.fill("#login-password", ADMIN.password);
  await page.click("#login-submit");
  await page.waitForSelector("#posts-tbody", { timeout: 8000 });
  check("admin loga e vê a lista de comunicados", true);

  // ===== ADMIN: cria post via formulário real =====
  await page.evaluate(() => {
    location.hash = "#/posts/nova";
  });
  await page.waitForSelector("#post-form", { timeout: 8000 });
  await page.fill("#f-title", title);
  await page.selectOption("#f-category", "rh");
  await page.click("label.toggle"); // toggle customizado: clica o label, não o input oculto
  await page.fill("#f-author-name", "Atlas QA");
  await page.fill("#f-author-role", "Teste Automatizado");
  await page.fill("#f-body", "Parágrafo um do comunicado.\n\nParágrafo dois do comunicado.");
  await page.click("#form-submit");

  // volta para #/posts e o novo post aparece na lista do admin
  await page.waitForFunction(
    (t) => document.querySelector("#posts-tbody")?.textContent.includes(t),
    title,
    { timeout: 8000 }
  );
  check("admin cria post via UI e ele aparece na lista do admin", true, title);

  // ===== PWA: o post enviado pelo admin aparece no feed =====
  const pwa = await context.newPage();
  pwa.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push("pwa:" + msg.text());
  });
  pwa.on("pageerror", (err) => consoleErrors.push("pwa:" + String(err)));

  await pwa.goto(PWA_URL, { waitUntil: "load" });
  await pwa.waitForSelector("#login-form", { timeout: 8000 });
  await pwa.fill("#login-email", ADMIN.email);
  await pwa.fill("#login-pass", ADMIN.password);
  await pwa.click("#btn-login");
  await pwa.waitForSelector(".post-card", { timeout: 8000 });

  await pwa.reload({ waitUntil: "load" });
  await pwa.waitForSelector(".post-card", { timeout: 8000 });
  await pwa.waitForFunction(
    (t) =>
      [...document.querySelectorAll(".post-card .post-title")].some((e) =>
        e.textContent.includes(t)
      ),
    title,
    { timeout: 8000 }
  );
  const appeared = await pwa.evaluate((t) => {
    const card = [...document.querySelectorAll(".post-card")].find((c) =>
      c.querySelector(".post-title")?.textContent.includes(t)
    );
    return {
      found: !!card,
      urgent: !!card?.querySelector(".badge-urgent"),
      first: card === document.querySelector(".post-card"),
    };
  }, title);
  check("PWA exibe o comunicado criado pelo admin (UI→UI)", appeared.found, title);
  check("card marcado como urgente no PWA", appeared.urgent === true);
  check("comunicado novo no topo do feed do PWA", appeared.first === true);

  check("console sem erros", consoleErrors.length === 0, `${consoleErrors.length} erros`);
} catch (err) {
  check("fluxo sem exceções", false, String(err).slice(0, 200));
}

const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
await browser.close();
process.exit(failed.length ? 1 : 0);
