import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Tenant from "../src/models/Tenant.js";
import User from "../src/models/User.js";
import Comunicado from "../src/models/Comunicado.js";
import Group from "../src/models/Group.js";
import Category from "../src/models/Category.js";
import Interaction from "../src/models/Interaction.js";
import app from "../src/app.js";
import { reconcile, startExpiredSweep } from "../src/scheduler.js";
import { emitSafe, EVENTS, emitter } from "../src/events.js";
import { migrate } from "./migrate-mt24.mjs";

// Teste de integração (Mongo real) da MT-24 — scheduler, SSE, escopo estrito e migração por tenant.
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const tenantA = await Tenant.create({ slug: "tenanta", name: "Tenant A", active: true });
const tenantB = await Tenant.create({ slug: "tenantb", name: "Tenant B", active: true });
const tenantInactive = await Tenant.create({
  slug: "tenantc",
  name: "Tenant C",
  active: false,
});
const idA = String(tenantA._id);
const idB = String(tenantB._id);

const adminA = await User.create({
  email: "admina.mt24@x.com",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin A",
  role: "admin",
  tenantId: tenantA._id,
});
const adminB = await User.create({
  email: "adminb.mt24@x.com",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin B",
  role: "admin",
  tenantId: tenantB._id,
});

const server = app.listen(4024);
const base = "http://localhost:4024/api";

async function req(method, path, body, token, tenantSlug) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ok: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name} ${extra}`);
  }
}

const loginA = await req("POST", "/auth/login", { email: adminA.email, password: "senha123" }, null, "tenanta");
const loginB = await req("POST", "/auth/login", { email: adminB.email, password: "senha123" }, null, "tenantb");
check("login A 200", loginA.status === 200);
check("login B 200", loginB.status === 200);
const tokA = loginA.data.token;
const tokB = loginB.data.token;

// ============ (a) Scheduler libera apenas comunicados de tenants ativos ============
console.log("\n=== (a) scheduler: liberação por tenant ===");
const past = new Date(Date.now() - 60 * 60 * 1000);
const schedA = await Comunicado.create({
  _id: "mt24-sched-a", title: "Agendado A", body: ["a"], categoryId: "geral",
  createdBy: adminA._id, tenantId: tenantA._id, published: false, publishAt: past,
});
const schedC = await Comunicado.create({
  _id: "mt24-sched-c", title: "Agendado C", body: ["c"], categoryId: "geral",
  createdBy: adminA._id, tenantId: tenantInactive._id, published: false, publishAt: past,
});
const schedLegacy = await Comunicado.create({
  _id: "mt24-sched-leg", title: "Agendado Legado", body: ["l"], categoryId: "geral",
  createdBy: adminA._id, tenantId: null, published: false, publishAt: past,
});
await reconcile();
const sA = await Comunicado.findById("mt24-sched-a").lean();
const sC = await Comunicado.findById("mt24-sched-c").lean();
const sLeg = await Comunicado.findById("mt24-sched-leg").lean();
check("agendado de tenant ativo foi liberado", sA.published === true);
check("agendado de tenant inativo NÃO foi liberado", sC.published === false);
check("agendado legado (null) NÃO foi liberado", sLeg.published === false);

// ============ (b) Sweep de expiração escopado (emite com tenantId, ignora legado) ============
console.log("\n=== (b) expiração: sweep escopado ===");
const expiredA = await Comunicado.create({
  _id: "mt24-exp-a", title: "Exp A", body: ["a"], categoryId: "geral", tenantId: tenantA._id,
  published: true, expiresAt: new Date(Date.now() - 60 * 60 * 1000),
});
const expiredLegacy = await Comunicado.create({
  _id: "mt24-exp-leg", title: "Exp Leg", body: ["l"], categoryId: "geral", tenantId: null,
  published: true, expiresAt: new Date(Date.now() - 60 * 60 * 1000),
});
const capturedExpired = [];
emitter.on(EVENTS.POST_EXPIRED, (p) => capturedExpired.push(p));
const sweepHandle = startExpiredSweep();
await new Promise((r) => setTimeout(r, 300));
clearInterval(sweepHandle);
emitter.removeAllListeners(EVENTS.POST_EXPIRED);
const expAEvent = capturedExpired.find((p) => p.id === "mt24-exp-a");
check("expirado do tenant A emite com tenantId", expAEvent && expAEvent.tenantId === idA);
check("expirado legado (null) NÃO é emitido", !capturedExpired.some((p) => p.id === "mt24-exp-leg"));

// ============ (c) Escopo estrito: legado null invisível ============
console.log("\n=== (c) escopo estrito ===");
const legacyPost = await Comunicado.create({
  _id: "mt24-legacy", title: "Legado", body: ["l"], categoryId: "geral",
  createdBy: adminA._id, tenantId: null, published: true,
});
const legacyFromA = await req("GET", `/posts/${legacyPost._id}`, null, tokA, "tenanta");
check("GET /:id legado null a partir de A -> 404 (estrito)", legacyFromA.status === 404);
const listA = await req("GET", "/posts", null, tokA, "tenanta");
const listAIds = (listA.data ?? []).map((p) => p.id);
check("lista de A NÃO contém legado null", !listAIds.includes("mt24-legacy"));
check(
  "payload do post de A inclui tenantId",
  listA.data && listA.data.some((p) => p.id === "mt24-sched-a" && p.tenantId === idA)
);

// ============ (e) SSE: cliente de A não recebe evento de B, recebe o de A ============
console.log("\n=== (e) isolamento SSE por tenant ===");
async function readSSE(token, durationMs) {
  const controller = new AbortController();
  const res = await fetch(`${base}/events`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal,
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const events = [];
  const abortTimer = setTimeout(() => controller.abort(), durationMs);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const evtLine = block.split("\n").find((l) => l.startsWith("event: "));
        const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
        if (evtLine && dataLine) {
          events.push({ event: evtLine.slice(7), data: JSON.parse(dataLine.slice(6)) });
        }
      }
    }
  } catch {
    /* abort esperado ao final da janela */
  } finally {
    clearTimeout(abortTimer);
  }
  return events;
}
const eventsPromise = readSSE(tokA, 2500);
await new Promise((r) => setTimeout(r, 500));
emitSafe(EVENTS.POST_NEW, { id: "evt-b", tenantId: idB });
await new Promise((r) => setTimeout(r, 400));
emitSafe(EVENTS.POST_NEW, { id: "evt-a", tenantId: idA });
const eventsA = await eventsPromise;
const idsReceived = eventsA.map((e) => e.data.id);
check("SSE A NÃO recebe evento do tenant B", !idsReceived.includes("evt-b"));
check("SSE A recebe evento do tenant A", idsReceived.includes("evt-a"));

// ============ (d) Migração backfilla para o tenant default ============
console.log("\n=== (d) migração/backfill ===");
await migrate(); // reutiliza a conexão; cria tenant default e associa os null
const defaultTenant = await Tenant.findOne({ slug: process.env.DEFAULT_TENANT_SLUG || "interna" }).lean();
check("tenant default garantido", !!defaultTenant);
const remainingNull = await Comunicado.countDocuments({
  $or: [{ tenantId: null }, { tenantId: { $exists: false } }],
});
check("nenhum comunicado restante com tenantId null após migração", remainingNull === 0);
const migratedLegacy = await Comunicado.findById("mt24-legacy").lean();
check("legado associado ao tenant default", String(migratedLegacy.tenantId) === String(defaultTenant._id));

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);
