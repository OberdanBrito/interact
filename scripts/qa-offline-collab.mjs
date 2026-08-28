import { createRequire } from "module";
import path from "node:path";
const require = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = require("playwright-core");

const BASE = "http://127.0.0.1:8080";
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch({
  executablePath: process.env.QA_CHROME ?? "/opt/google/chrome/chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

try {
  // Login como colaborador de operações (tem grupo operacoes)
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(800);
  await page.fill("#login-email", "colaborador.operacoes@interactcorp.com.br");
  await page.fill("#login-pass", "senha123");
  await page.click("#btn-login");
  await page.waitForTimeout(2000);

  const online = await page.evaluate(() => ({
    cards: document.querySelectorAll(".post-card").length,
    envSelector: !document.querySelector("#env-selector").hidden,
  }));
  check("online: colaborador vê feed filtrado", online.cards > 0, `cards=${online.cards}`);
  check("online: seletor de ambiente visível", online.envSelector === true);

  // Offline: reload e verificar filtro por grupo
  await context.setOffline(true);
  await page.reload({ waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(2000);

  const offline = await page.evaluate(() => ({
    feed: !document.querySelector("#view-feed").hidden,
    cards: document.querySelectorAll(".post-card").length,
    envSelector: !document.querySelector("#env-selector").hidden,
    badges: [...document.querySelectorAll(".badge-targeted")].length,
  }));
  check(
    "offline: colaborador vê posts do cache filtrados",
    offline.feed && offline.cards > 0,
    `cards=${offline.cards}`
  );
  check(
    "offline: seletor de ambiente continua visível",
    offline.envSelector === true
  );
  check(
    "offline: posts direcionados visíveis (operacoes)",
    offline.badges > 0,
    `badges=${offline.badges}`
  );

  // Trocar para ambiente "operacoes" offline
  await page.evaluate(() => {
    const chip = [...document.querySelectorAll("#env-selector .chip")].find(
      (c) => c.textContent === "operacoes"
    );
    chip?.click();
  });
  await page.waitForTimeout(800);
  const envOp = await page.evaluate(
    () => document.querySelectorAll(".post-card").length
  );
  check("offline: ambiente operacoes mostra posts", envOp > 0, `cards=${envOp}`);

  await context.setOffline(false);
} catch (err) {
  check("fluxo sem exceções", false, String(err).slice(0, 200));
}

const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
await browser.close();
process.exit(failed.length ? 1 : 0);