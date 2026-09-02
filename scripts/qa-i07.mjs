import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import Tenant from "../src/models/Tenant.js";
import Comunicado from "../src/models/Comunicado.js";
import app from "../src/app.js";
import { startExpiredSweep } from "../src/scheduler.js";

// Teste de integração (Mongo real) da I-07 — Canal SSE (tempo real de comunicados).
// Uso: npm run qa:i07  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const tenant = await Tenant.create({ slug: "i07", name: "Tenant I-07", active: true });
const TENANT_SLUG = tenant.slug;

const admin = await User.create({
  email: "admin.i07@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin I-07",
  role: "admin",
  tenantId: tenant._id,
});
const collab = await User.create({
  email: "colab.i07@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab I-07",
  role: "colaborador",
  groupIds: [],
  tenantId: tenant._id,
});

const server = app.listen(4009);
const base = "http://localhost:4009/api";

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

let pass = 0,
  fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ok: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name} ${extra}`);
  }
}

// Abre o stream SSE e agarra eventos nomeados.
function openEvents(token) {
  const controller = new AbortController();
  const state = { events: [], waiters: [], httpStatus: 200 };
  let resolveConnected;
  const connected = new Promise((r) => { resolveConnected = r; });
  (async () => {
    try {
      const res = await fetch(`${base}/events?token=${token}`, {
        signal: controller.signal,
      });
      state.httpStatus = res.status;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          if (block.startsWith(":connected")) resolveConnected();
          const evMatch = block.match(/^event: (.+)$/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (evMatch && dataMatch) {
            const ev = { event: evMatch[1], data: JSON.parse(dataMatch[1]) };
            state.events.push(ev);
            for (const w of [...state.waiters]) {
              if (w.event === ev.event) {
                w.resolve(ev);
                state.waiters.splice(state.waiters.indexOf(w), 1);
              }
            }
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("SSE read error:", e.message);
      }
    }
  })();
  return {
    state,
    connected,
    waitFor(event, timeout = 3000) {
      return new Promise((resolve, reject) => {
        const found = state.events.find((e) => e.event === event);
        if (found) return resolve(found);
        const t = setTimeout(() => {
          state.waiters = state.waiters.filter((w) => w.event !== event);
          reject(new Error(`timeout aguardando ${event}`));
        }, timeout);
        state.waiters.push({ event, resolve: (v) => { clearTimeout(t); resolve(v); } });
      });
    },
    notWithin(event, ms = 1500) {
      return new Promise((resolve) => {
        const w = { event, resolve: () => { clearTimeout(t); cleanup(); resolve(false); } };
        const t = setTimeout(() => { cleanup(); resolve(true); }, ms);
        function cleanup() {
          state.waiters = state.waiters.filter((x) => x !== w);
        }
        state.waiters.push(w);
      });
    },
    close: () => controller.abort(),
  };
}

const adminLogin = await req("POST", "/auth/login", {
  email: admin.email,
  password: "senha123",
}, null, TENANT_SLUG);
const adminTok = adminLogin.data.token;
check("login admin", !!adminTok);

// 1) Endpoint sem token → 401
{
  const r = await fetch(`${base}/events`, {
    headers: { Authorization: "Bearer " },
  });
  check("401 sem token", r.status === 401, `status=${r.status}`);
}

// 2) 200 com token (stream abre)
{
  const s = openEvents(adminTok);
  await new Promise((r) => setTimeout(r, 400));
  check("200 com token", s.state.httpStatus === 200, `status=${s.state.httpStatus}`);
  s.close();
}

// 3) POST publicado → post:new
{
  const s = openEvents(adminTok);
  const created = await req(
    "POST",
    "/posts",
    { title: "Publicado i07", categoryId: "geral", body: ["olá"] },
    adminTok,
    TENANT_SLUG
  );
  const ev = await s.waitFor("post:new");
  check("post:new apos publicar", ev.data.id === created.data.id, JSON.stringify(ev.data));
  s.close();
}

// 4) PUT editando um publicado → post:updated
{
  const created = await req(
    "POST",
    "/posts",
    { title: "Para editar i07", categoryId: "geral", body: ["x"] },
    adminTok,
    TENANT_SLUG
  );
  const s = openEvents(adminTok);
  const updated = await req("PUT", `/posts/${created.data.id}`, { title: "Editado i07" }, adminTok, TENANT_SLUG);
  const ev = await s.waitFor("post:updated");
  check("post:updated apos editar", ev.data.id === created.data.id && updated.status === 200, JSON.stringify(ev.data));
  s.close();
}

// 5) Rascunho NÃO emite post:new
{
  const s = openEvents(adminTok);
  await req("POST", "/posts", { title: "draft i07", status: "draft" }, adminTok, TENANT_SLUG);
  const noEvt = await s.notWithin("post:new", 1500);
  check("rascunho nao emite post:new", noEvt === true);
  s.close();
}

// 6) Expirado → post:expired e documento não deletado
{
  const exp = await req(
    "POST",
    "/posts",
    {
      title: "Expira i07",
      categoryId: "geral",
      body: ["validade vencida"],
      expiresAt: "2020-01-01T00:00:00Z",
    },
    adminTok,
    TENANT_SLUG
  );
  const s = openEvents(adminTok);
  await s.connected;
  const stopSweep = startExpiredSweep();
  const ev = await s.waitFor("post:expired");
  check("post:expired apos sweep", ev.data.id === exp.data.id, JSON.stringify(ev.data));
  const stillInDb = await Comunicado.findById(exp.data.id);
  check("documento nao deletado", !!stillInDb);
  clearInterval(stopSweep);
  s.close();
}

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);
