import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import Tenant from "../src/models/Tenant.js";
import Comunicado from "../src/models/Comunicado.js";
import app from "../src/app.js";

// Teste de integração (Mongo real) da MT-22 — escopo por tenant em /api/posts + IDs UUID.
// Uso: npm run test:integration  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

// Tenants e usuários isolados
const tenantA = await Tenant.create({ slug: "tenanta", name: "Tenant A" });
const tenantB = await Tenant.create({ slug: "tenantb", name: "Tenant B" });
const idA = tenantA._id.toString();
const idB = tenantB._id.toString();

const adminA = await User.create({
  email: "mt22-admin-a@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin A",
  role: "admin",
  tenantId: tenantA._id,
});
const adminB = await User.create({
  email: "mt22-admin-b@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin B",
  role: "admin",
  tenantId: tenantB._id,
});
// Colaborador do tenant A (sem grupo: vê broadcast do seu tenant)
const collabA = await User.create({
  email: "mt22-collab-a@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab A",
  role: "collab",
  tenantId: tenantA._id,
});

// Comunicados: um por tenant + um legado (tenantId null)
const postA = await Comunicado.create({
  _id: "mt22-post-a",
  title: "Post A",
  body: ["a"],
  categoryId: "geral",
  createdBy: adminA._id,
  tenantId: tenantA._id,
  published: true,
});
const postB = await Comunicado.create({
  _id: "mt22-post-b",
  title: "Post B",
  body: ["b"],
  categoryId: "geral",
  createdBy: adminB._id,
  tenantId: tenantB._id,
  published: true,
});
const legacyPost = await Comunicado.create({
  _id: "mt22-legacy",
  title: "Legado",
  body: ["l"],
  categoryId: "geral",
  createdBy: adminA._id,
  tenantId: null,
  published: true,
});

const server = app.listen(4022);
const base = "http://localhost:4022/api";

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
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Logins por tenant
const loginA = await req("POST", "/auth/login", {
  email: adminA.email,
  password: "senha123",
}, null, "tenanta");
const loginB = await req("POST", "/auth/login", {
  email: adminB.email,
  password: "senha123",
}, null, "tenantb");
check("login A 200", loginA.status === 200, JSON.stringify(loginA.data));
check("login B 200", loginB.status === 200, JSON.stringify(loginB.data));
const tokA = loginA.data.token;
const tokB = loginB.data.token;
const loginColabA = await req("POST", "/auth/login", {
  email: collabA.email,
  password: "senha123",
}, null, "tenanta");
check("login colab A 200", loginColabA.status === 200);
const tokColabA = loginColabA.data.token;

// (a) GET /api/posts retorna apenas comunicados do tenant (admin)
const listA = await req("GET", "/posts", null, tokA, "tenanta");
const listAIds = (listA.data ?? []).map((p) => p.id);
check("admin A lista (200)", listA.status === 200, JSON.stringify(listA.data));
check(
  "admin A vê Post A",
  listAIds.includes("mt22-post-a"),
  JSON.stringify(listAIds)
);
check(
  "admin A NÃO vê Post B",
  !listAIds.includes("mt22-post-b"),
  JSON.stringify(listAIds)
);
check(
  "admin A vê legado null (ponte)",
  listAIds.includes("mt22-legacy"),
  JSON.stringify(listAIds)
);

const listB = await req("GET", "/posts", null, tokB, "tenantb");
const listBIds = (listB.data ?? []).map((p) => p.id);
check(
  "admin B vê Post B e NÃO vê Post A",
  listBIds.includes("mt22-post-b") && !listBIds.includes("mt22-post-a"),
  JSON.stringify(listBIds)
);

// (a2) Colaborador também é escopado por tenant
const colabList = await req("GET", "/posts", null, tokColabA, "tenanta");
const colabIds = (colabList.data ?? []).map((p) => p.id);
check(
  "colab A vê Post A e NÃO vê Post B",
  colabIds.includes("mt22-post-a") && !colabIds.includes("mt22-post-b"),
  JSON.stringify(colabIds)
);

// (b) GET /:id de outro tenant -> 404 (não 403)
const getBFromA = await req("GET", `/posts/${postB._id}`, null, tokA, "tenanta");
check("GET /:id Post B a partir de A -> 404", getBFromA.status === 404, JSON.stringify(getBFromA.data));
const getAFromA = await req("GET", `/posts/${postA._id}`, null, tokA, "tenanta");
check("GET /:id Post A a partir de A -> 200", getAFromA.status === 200);
const getLegacyFromA = await req("GET", `/posts/${legacyPost._id}`, null, tokA, "tenanta");
check("GET /:id legado null a partir de A -> 200 (ponte)", getLegacyFromA.status === 200);

// Mutação cross-tenant: PUT e DELETE -> 404 sem revelar existência
const putBFromA = await req("PUT", `/posts/${postB._id}`, { title: "invadir" }, tokA, "tenanta");
check("PUT /:id Post B a partir de A -> 404", putBFromA.status === 404, JSON.stringify(putBFromA.data));
const delBFromA = await req("DELETE", `/posts/${postB._id}`, null, tokA, "tenanta");
check("DELETE /:id Post B a partir de A -> 404", delBFromA.status === 404, JSON.stringify(delBFromA.data));
const stillB = await req("GET", `/posts/${postB._id}`, null, tokB, "tenantb");
check("Post B ainda existe (não foi excluído)", stillB.status === 200);

// Anexo cross-tenant: GET attachment de outra tenant -> 404 (isPostEligible)
const attBFromA = await req(
  "GET",
  `/posts/${postB._id}/attachments/qualquer`,
  null,
  tokA,
  "tenanta"
);
check("GET attachment de Post B a partir de A -> 404", attBFromA.status === 404);

// (c) POST cria comunicado com tenantId do tenant e id UUID
const created = await req(
  "POST",
  "/posts",
  {
    title: "Criado em A",
    categoryId: "geral",
    body: ["criado"],
    author: { name: "Admin A" },
    status: "published",
  },
  tokA,
  "tenanta"
);
check("POST -> 201", created.status === 201, JSON.stringify(created.data));
const newId = created.data?.id;
check("id gerado é UUID", UUID_RE.test(newId ?? ""), String(newId));
const newDoc = await Comunicado.findById(newId).lean();
check(
  "comunicado persistido com tenantId do tenant A",
  newDoc && String(newDoc.tenantId) === idA,
  JSON.stringify(newDoc?.tenantId)
);
const newInA = await req("GET", "/posts", null, tokA, "tenanta");
check(
  "novo comunicado aparece na lista de A",
  newInA.data.some((p) => p.id === newId)
);
const newInB = await req("GET", "/posts", null, tokB, "tenantb");
check(
  "novo comunicado NÃO aparece na lista de B",
  !newInB.data.some((p) => p.id === newId)
);

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);
