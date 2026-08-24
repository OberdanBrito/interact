import { createRequire } from "module";
import path from "node:path";
const require = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = require("playwright-core");

const BASE = process.env.QA_BASE_URL ?? "http://127.0.0.1:8080";
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

const readIds = () =>
  page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("interact.user.bruno.lima@interactcorp.com.br") ||
          '{"read":[]}'
      ).read
  );
const dotVisible = (pid) =>
  page.evaluate((id) => {
    const d = document.querySelector(`.post-card[data-post-id="${id}"] .unread-dot`);
    return d ? !d.hidden : null;
  }, pid);

try {
  // 1. First load → login
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(800);
  check(
    "login visível no primeiro acesso",
    await page.evaluate(() => !document.querySelector("#view-login").hidden)
  );

  await page.fill("#login-email", "bruno.lima@interactcorp.com.br");
  await page.fill("#login-pass", "senha123");
  await page.click("#btn-login");
  await page.waitForTimeout(1500);

  const feedState = await page.evaluate(() => ({
    cards: document.querySelectorAll(".post-card").length,
    dots: [...document.querySelectorAll(".unread-dot")].filter((d) => !d.hidden)
      .length,
    readBtns: document.querySelectorAll(".post-card .js-read").length,
    initials: document.querySelector("#user-initials").textContent,
  }));
  check("feed com 10 cards", feedState.cards === 10, `cards=${feedState.cards}`);
  check("10 dots de não-lido", feedState.dots === 10, `dots=${feedState.dots}`);
  check(
    "2 botões de ack (p02/p05)",
    feedState.readBtns === 2,
    `btns=${feedState.readBtns}`
  );
  check("iniciais BL no avatar", feedState.initials === "BL", feedState.initials);

  // 2. Like bidirecional
  const likeBtn = page.locator('.post-card[data-post-id="p01"] .js-like');
  await likeBtn.click();
  await page.waitForTimeout(250);
  let likeCount = await likeBtn.locator(".like-count").textContent();
  const pressed = await likeBtn.getAttribute("aria-pressed");
  check("curtir p01: 24→25 + pressed", likeCount === "25" && pressed === "true");
  await likeBtn.click();
  await page.waitForTimeout(250);
  likeCount = await likeBtn.locator(".like-count").textContent();
  check("descurtir p01: volta a 24", likeCount === "24");

  // 3. Auto (p06): marca na abertura se o texto couber na tela; senão por dwell
  await page.locator('.post-card[data-post-id="p06"] .js-open-post').click();
  const overflows = await page.evaluate(() => {
    const b = document.querySelector(".sheet-body");
    return b.scrollHeight > b.clientHeight;
  });
  await page.waitForTimeout(overflows ? 3400 : 400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check(
    `auto p06 marca (${overflows ? "dwell" : "na abertura"})`,
    (await readIds()).includes("p06") && !(await dotVisible("p06"))
  );

  // 4. Ack negativo (p05): dwell + scroll NÃO marca; botão sim
  await page.evaluate(() =>
    localStorage.setItem(
      "interact.user.bruno.lima@interactcorp.com.br",
      JSON.stringify({ likes: [], read: [] })
    )
  );
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(700);

  await page.locator('.post-card[data-post-id="p05"] .js-open-post').click();
  await page.waitForTimeout(3400);
  await page.evaluate(() => {
    const b = document.querySelector(".sheet-body");
    b.scrollTop = b.scrollHeight;
  });
  await page.waitForTimeout(400);
  const ackNeg = {
    unread: !(await readIds()).includes("p05"),
    btn: (await page.locator("#sheet-actions .js-read").count()) === 1,
  };
  check("ack imune a dwell+scroll", ackNeg.unread && ackNeg.btn);

  await page.locator("#sheet-actions .js-read").click();
  await page.waitForTimeout(300);
  const toastVisible = await page.evaluate(() =>
    document.querySelector("#toast").classList.contains("is-visible")
  );
  check("ack via botão marca + toast", (await readIds()).includes("p05") && toastVisible);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 5. Viewport baixo: overflow real → dwell e scroll
  await page.setViewportSize({ width: 375, height: 480 });
  await page.waitForTimeout(400);

  await page.locator('.post-card[data-post-id="p07"] .js-open-post').click();
  await page.waitForTimeout(3400);
  const untouched = await page.evaluate(
    () => document.querySelector(".sheet-body").scrollTop === 0
  );
  check("dwell 3s marca p07 sem scroll", (await readIds()).includes("p07") && untouched);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await page.locator('.post-card[data-post-id="p09"] .js-open-post').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const b = document.querySelector(".sheet-body");
    b.scrollTop = b.scrollHeight;
  });
  await page.waitForTimeout(250);
  check("scroll até o fim marca p09 antes do dwell", (await readIds()).includes("p09"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 6. Race abrir→fechar→reabrir
  await page.evaluate(() => {
    document.querySelector('.post-card[data-post-id="p07"] .js-open-post').click();
  });
  await page.evaluate(() => document.querySelector("#sheet-close").click());
  await page.evaluate(() => {
    document.querySelector('.post-card[data-post-id="p10"] .js-open-post').click();
  });
  await page.waitForTimeout(450);
  const race = await page.evaluate(() => ({
    hidden: document.querySelector("#sheet").hidden,
    postId: document.querySelector("#sheet-actions").dataset.postId,
  }));
  check("race reabertura mantém sheet do post certo", !race.hidden && race.postId === "p10");
  await page.waitForTimeout(3100);
  check("dwell do p10 sobrevive à reabertura", (await readIds()).includes("p10"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 7. Service worker + precache
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(5000);
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const names = await caches.keys();
    const detail = {};
    for (const n of names) {
      detail[n] = (await (await caches.open(n)).keys()).length;
    }
    return {
      controlled: !!navigator.serviceWorker.controller,
      active: reg?.active?.scriptURL ?? null,
      caches: detail,
    };
  });
  const precacheName = Object.keys(sw.caches).find((n) =>
    n.includes("precache")
  );
  check(
    "SW ativo controlando a página",
    sw.controlled && sw.active?.endsWith("/sw.js"),
    sw.active ?? "sem registro"
  );
  check(
    "workbox-precache populado (≥8)",
    !!precacheName && sw.caches[precacheName] >= 8,
    JSON.stringify(sw.caches)
  );

  // 8. Manifest
  const manifestOk = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    return link && (await fetch(link.href)).status === 200;
  });
  check("manifest injetado e acessível", manifestOk === true);

  // 9. Offline
  await context.setOffline(true);
  await page.reload({ waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(1200);
  const offline = await page.evaluate(() => ({
    feed: !document.querySelector("#view-feed").hidden,
    cards: document.querySelectorAll(".post-card").length,
  }));
  check("offline: app carrega do precache", offline.feed && offline.cards === 10);
  await context.setOffline(false);
} catch (err) {
  check("fluxo sem exceções", false, String(err).slice(0, 160));
}

check("console sem erros", consoleErrors.length === 0, `${consoleErrors.length} erros`);

const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
await browser.close();
process.exit(failed.length ? 1 : 0);
