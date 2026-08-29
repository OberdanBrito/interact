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

// Spy na Badging API ANTES do app carregar — testa o caminho real
// (renderFeed → refreshBadge → setAppBadge), sem importar módulos-fonte.
await context.addInitScript(() => {
  window.__badgeCalls = [];
  if ("setAppBadge" in navigator) {
    const orig = navigator.setAppBadge.bind(navigator);
    navigator.setAppBadge = async (n) => {
      window.__badgeCalls.push({ type: "set", n });
      return orig(n);
    };
  }
  if ("clearAppBadge" in navigator) {
    const orig = navigator.clearAppBadge.bind(navigator);
    navigator.clearAppBadge = async () => {
      window.__badgeCalls.push({ type: "clear" });
      return orig();
    };
  }
});

const page = await context.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

const readOrder = () =>
  page.evaluate(() =>
    [...document.querySelectorAll(".post-card")].map((c) => ({
      id: c.dataset.postId,
      urgent: !!c.querySelector(".badge-urgent"),
      unread: !c.querySelector(".unread-dot").hidden,
    }))
  );
const setRead = (ids) =>
  page.evaluate((ids) => {
    const key = "interact.user.admin@interactcorp.com.br";
    const userData = JSON.parse(localStorage.getItem(key) || '{"likes":[],"read":[]}');
    userData.read = [...new Set([...userData.read, ...ids])];
    localStorage.setItem(key, JSON.stringify(userData));
  }, ids);
const lastBadgeCall = () =>
  page.evaluate(() => window.__badgeCalls[window.__badgeCalls.length - 1] || null);

try {
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(800);
  await page.fill("#login-email", "admin@interactcorp.com.br");
  await page.fill("#login-pass", "senha123");
  await page.click("#btn-login");
  await page.waitForTimeout(2500);

  // 1. Ordenação: urgentes primeiro (invariante independente de estado de leitura)
  const order = await readOrder();
  check("feed tem posts", order.length > 0, `cards=${order.length}`);
  const firstUrgentIdx = order.findIndex((p) => p.urgent);
  const lastNonUrgentIdx = order.map((p) => p.urgent).lastIndexOf(false);
  check(
    "urgentes vêm antes de não-urgentes",
    firstUrgentIdx === -1 || firstUrgentIdx < lastNonUrgentIdx,
    `primeiro urgente=${firstUrgentIdx}, último não-urgente=${lastNonUrgentIdx}`
  );

  // 2. Não-lidos antes de lidos (dentro do mesmo grupo de urgência)
  let sortOk = true;
  let sortDetail = "";
  for (let i = 1; i < order.length; i++) {
    const prev = order[i - 1];
    const cur = order[i];
    if (prev.urgent === cur.urgent && !prev.unread && cur.unread) {
      sortOk = false;
      sortDetail = `lido (${prev.id}) antes de não-lido (${cur.id}) na posição ${i}`;
      break;
    }
  }
  check("não-lidos antes de lidos (mesma urgência)", sortOk, sortDetail);

  // 3. Marcar um post NÃO-LIDO como lido → deve descer abaixo dos não-lidos restantes
  const unreadPost = order.find((p) => p.unread);
  if (unreadPost) {
    await setRead([unreadPost.id]);
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(2000);
    const orderAfterRead = await readOrder();
    const targetIdx = orderAfterRead.findIndex((p) => p.id === unreadPost.id);
    const firstUnreadIdx = orderAfterRead.findIndex((p) => p.unread);
    check(
      "post lido desce na ordenação",
      targetIdx > firstUnreadIdx,
      `lido na posição ${targetIdx}, primeiro não-lido na ${firstUnreadIdx}`
    );
  } else {
    check("post lido desce na ordenação", true, "sem não-lidos para testar");
  }

  // 4. Badge: após login com não-lidos, setAppBadge foi chamado com contagem > 0
  const badgeAfterLogin = await lastBadgeCall();
  check(
    "badge: setAppBadge chamado com contagem > 0 após login",
    badgeAfterLogin && badgeAfterLogin.type === "set" && badgeAfterLogin.n > 0,
    JSON.stringify(badgeAfterLogin)
  );

  // 5. Marcar TODOS como lidos → badge zera (clear ou set 0)
  const allIds = order.map((p) => p.id);
  await setRead(allIds);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(2000);
  const badgeAfterAllRead = await lastBadgeCall();
  const badgeZeroed =
    badgeAfterAllRead &&
    (badgeAfterAllRead.type === "clear" ||
      (badgeAfterAllRead.type === "set" && badgeAfterAllRead.n === 0));
  check("badge: zera quando tudo lido", badgeZeroed, JSON.stringify(badgeAfterAllRead));
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