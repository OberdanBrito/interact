import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import Tenant from "../src/models/Tenant.js";
import app from "../src/app.js";

// Teste de integração (Mongo real) da MT-21 — auth e login por tenant.
// Uso: npm run test:integration  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

// Tenants isolados (slugs usados no header X-Tenant-Slug)
const tenantA = await Tenant.create({ slug: "tenanta", name: "Tenant A" });
const tenantB = await Tenant.create({ slug: "tenantb", name: "Tenant B" });
const idA = tenantA._id.toString();
const idB = tenantB._id.toString();

// Usuário em A; o mesmo e-mail também existe em B (isolação direta)
const userA = await User.create({
  email: "dup@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "User A",
  role: "admin",
  tenantId: tenantA._id,
});
const userB = await User.create({
  email: "dup@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "User B",
  role: "admin",
  tenantId: tenantB._id,
});
// E-mail que existe SÓ no tenant A (login no tenant B deve falhar)
const onlyA = await User.create({
  email: "only-a@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Only A",
  role: "admin",
  tenantId: tenantA._id,
});

const server = app.listen(4021);
const base = "http://localhost:4021/api";

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

function decodeJwt(token) {
  const payload = token.split(".")[1];
  return JSON.parse(
    Buffer.from(payload, "base64url").toString("utf-8")
  );
}

// 1) Critério 1 — JWT carrega tenantId do tenant resolvido (contexto A e B)
const loginA = await req(
  "POST",
  "/auth/login",
  { email: userA.email, password: "senha123" },
  null,
  "tenanta"
);
check("login A 200", loginA.status === 200, JSON.stringify(loginA.data));
const tokA = loginA.data?.token;
const jwtA = decodeJwt(tokA);
check(
  "JWT A carrega tenantId do tenant A",
  jwtA.tenantId === idA,
  JSON.stringify(jwtA)
);
check(
  "resposta user.tenantId = tenant A",
  loginA.data?.user?.tenantId === idA,
  JSON.stringify(loginA.data?.user)
);

const loginB = await req(
  "POST",
  "/auth/login",
  { email: userB.email, password: "senha123" },
  null,
  "tenantb"
);
check("login B 200", loginB.status === 200, JSON.stringify(loginB.data));
const jwtB = decodeJwt(loginB.data?.token);
check(
  "JWT B carrega tenantId do tenant B",
  jwtB.tenantId === idB,
  JSON.stringify(jwtB)
);

// 2) Critério 2 — login de e-mail de outro tenant é rejeitado (401)
const crossLogin = await req(
  "POST",
  "/auth/login",
  { email: onlyA.email, password: "senha123" },
  null,
  "tenantb"
);
check(
  "login email-so-A no tenant B -> 401",
  crossLogin.status === 401,
  JSON.stringify(crossLogin.data)
);

// 2b) Mesmo e-mail em dois tenants: cada login autentica no seu tenant (isolação direta)
const sameLoginA = await req(
  "POST",
  "/auth/login",
  { email: userA.email, password: "senha123" },
  null,
  "tenanta"
);
const sameLoginB = await req(
  "POST",
  "/auth/login",
  { email: userA.email, password: "senha123" },
  null,
  "tenantb"
);
check(
  "dup login no tenant A -> token tenantId A",
  sameLoginA.status === 200 &&
    decodeJwt(sameLoginA.data.token).tenantId === idA,
  JSON.stringify(sameLoginA.data)
);
check(
  "dup login no tenant B -> token tenantId B",
  sameLoginB.status === 200 &&
    decodeJwt(sameLoginB.data.token).tenantId === idB,
  JSON.stringify(sameLoginB.data)
);

// 3) Critério 3 — request autenticado com token do tenant A em contexto B -> 403
const okCtxA = await req("GET", "/categories", null, tokA, "tenanta");
check(
  "token A no contexto A -> 200",
  okCtxA.status === 200,
  JSON.stringify(okCtxA.data)
);

const badCtxB = await req("GET", "/categories", null, tokA, "tenantb");
check(
  "token A no contexto B -> 403",
  badCtxB.status === 403,
  JSON.stringify(badCtxB.data)
);

// 3b) Sem header de tenant (QA legado), token com tenantId null casa com null -> 2xx
const legacyUser = await User.create({
  email: "legacy.null@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Legacy Null",
  role: "admin",
});
const legacyLogin = await req("POST", "/auth/login", {
  email: legacyUser.email,
  password: "senha123",
});
check(
  "login legado (sem header) 200",
  legacyLogin.status === 200,
  JSON.stringify(legacyLogin.data)
);
const legacyTok = legacyLogin.data?.token;
const legacyReq = await req("GET", "/categories", null, legacyTok);
check(
  "request legado (sem header) -> 200",
  legacyReq.status === 200,
  JSON.stringify(legacyReq.data)
);

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);
