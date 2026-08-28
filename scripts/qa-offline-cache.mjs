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
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

try {
  // 1. Login online
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(800);
  await page.fill("#login-email", "admin@interactcorp.com.br");
  await page.fill("#login-pass", "senha123");
  await page.click("#btn-login");
  await page.waitForTimeout(2000);

  const onlineCards = await page.evaluate(
    () => document.querySelectorAll(".post-card").length
  );
  check("online: feed carrega posts", onlineCards > 0, `cards=${onlineCards}`);

  // 2. IndexedDB cache populado?
  const cachedCount = await page.evaluate(async () => {
    const req = indexedDB.open("interact-cache");
    return await new Promise((resolve) => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("posts", "readonly");
        const store = tx.objectStore("posts");
        const countReq = store.count();
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => resolve(-1);
      };
      req.onerror = () => resolve(-1);
    });
  });
  check("IndexedDB: cache de posts populado", cachedCount > 0, `count=${cachedCount}`);

  // 3. Offline: reload e verificar que o feed vem do cache
  await context.setOffline(true);
  await page.reload({ waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(2000);

  const offline = await page.evaluate(() => ({
    feed: !document.querySelector("#view-feed").hidden,
    cards: document.querySelectorAll(".post-card").length,
    title: document.querySelector(".post-title")?.textContent ?? null,
  }));
  check(
    "offline: feed mostra posts do cache",
    offline.feed && offline.cards > 0,
    `cards=${offline.cards}`
  );
  check("offline: primeiro post tem título", !!offline.title, offline.title ?? "sem título");

  // 4. Offline: abrir bottom sheet de um post cacheado
  if (offline.cards > 0) {
    await page.locator(".js-open-post").first().click();
    await page.waitForTimeout(600);
    const sheet = await page.evaluate(() => ({
      hidden: document.querySelector("#sheet").hidden,
      title: document.querySelector("#sheet-title").textContent,
    }));
    check(
      "offline: bottom sheet abre com post do cache",
      !sheet.hidden && sheet.title.length > 0,
      sheet.title
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  await context.setOffline(false);
} catch (err) {
  check("fluxo sem exceções", false, String(err).slice(0, 200));
}

const unexpectedErrors = consoleErrors.filter(
  (e) => !e.includes("ERR_INTERNET_DISCONNECTED")
);
check(
  "console sem erros inesperados",
  unexpectedErrors.length === 0,
  `${unexpectedErrors.length} erros: ${unexpectedErrors.slice(0, 2).join(" | ")}`
);

const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
await browser.close();
process.exit(failed.length ? 1 : 0);