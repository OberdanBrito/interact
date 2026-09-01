import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import Tenant from "../src/models/Tenant.js";
import Group from "../src/models/Group.js";
import Comunicado from "../src/models/Comunicado.js";
import Interaction from "../src/models/Interaction.js";
import Category from "../src/models/Category.js";
import app from "../src/app.js";

// Teste de integração (Mongo real) da MT-23 — escopo por tenant em grupos, interações e categorias.
// Uso: npm run test:integration  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

// Tenants e dados isolados
const tenantA = await Tenant.create({ slug: "tenanta", name: "Tenant A" });
const tenantB = await Tenant.create({ slug: "tenantb", name: "Tenant B" });
const idA = tenantA._id.toString();
const idB = tenantB._id.toString();

// Grupos com o MESMO nome em ambos os tenants (para validar unicidade por tenant)
const groupA1 = await Group.create({ name: "operacoes", tenantId: tenantA._id });
const groupA2 = await Group.create({ name: "logistica", tenantId: tenantA._id });
const groupB1 = await Group.create({ name: "operacoes", tenantId: tenantB._id });

// Categorias com conjuntos DIFERENTES por tenant (para validar isolamento)
await Category.insertMany([
  { slug: "geral", label: "Geral", tenantId: tenantA._id },
  { slug: "rh", label: "RH", tenantId: tenantA._id },
]);
await Category.insertMany([
  { slug: "geral", label: "Geral", tenantId: tenantB._id },
  { slug: "ti", label: "TI", tenantId: tenantB._id },
  { slug: "noticias", label: "Notícias", tenantId: tenantB._id },
]);

// Admins e colaboradores por tenant
const adminA = await User.create({
  email: "mt23-admin-a@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin A",
  role: "admin",
  tenantId: tenantA._id,
});
const adminB = await User.create({
  email: "mt23-admin-b@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin B",
  role: "admin",
  tenantId: tenantB._id,
});
const collabA = await User.create({
  email: "mt23-collab-a@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab A",
  role: "colaborador",
  groupIds: [String(groupA1._id), String(groupA2._id)],
  tenantId: tenantA._id,
});
const collabB = await User.create({
  email: "mt23-collab-b@interact.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab B",
  role: "colaborador",
  groupIds: [String(groupB1._id)],
  tenantId: tenantB._id,
});

// Comunicados por tenant (broadcast, publicados)
const postA = await Comunicado.create({
  _id: "mt23-post-a",
  title: "Post A",
  body: ["a"],
  categoryId: "geral",
  targetGroups: [],
  createdBy: adminA._id,
  tenantId: tenantA._id,
  published: true,
});
const postB = await Comunicado.create({
  _id: "mt23-post-b",
  title: "Post B",
  body: ["b"],
  categoryId: "geral",
  targetGroups: [],
  createdBy: adminB._id,
  tenantId: tenantB._id,
  published: true,
});

const server = app.listen(4023);
const base = "http://localhost:4023/api";

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

// Logins
const loginA = await req("POST", "/auth/login", { email: adminA.email, password: "senha123" }, null, "tenanta");
const loginB = await req("POST", "/auth/login", { email: adminB.email, password: "senha123" }, null, "tenantb");
check("login admin A 200", loginA.status === 200, JSON.stringify(loginA.data));
check("login admin B 200", loginB.status === 200, JSON.stringify(loginB.data));
const tokA = loginA.data.token;
const tokB = loginB.data.token;
const loginColabA = await req("POST", "/auth/login", { email: collabA.email, password: "senha123" }, null, "tenanta");
check("login colab A 200", loginColabA.status === 200);
const tokColabA = loginColabA.data.token;

// ===== GRUPOS =====
// (a1) GET /groups — listagem isolada por tenant
const groupsA = await req("GET", "/groups", null, tokA, "tenanta");
const gAIds = (groupsA.data ?? []).map((g) => g.id);
check("admin A lista grupos (200)", groupsA.status === 200, JSON.stringify(groupsA.data));
check(
  "admin A vê operacoes e logistica",
  gAIds.includes(String(groupA1._id)) && gAIds.includes(String(groupA2._id)),
  JSON.stringify(gAIds)
);
check(
  "admin A NÃO vê grupo do tenant B (mesmo nome)",
  !gAIds.includes(String(groupB1._id)),
  JSON.stringify(gAIds)
);

// (a2) POST — nome único POR tenant; mesmo nome em tenant diferente é permitido
const dupA = await req("POST", "/groups", { name: "operacoes" }, tokA, "tenanta");
check("criar grupo com nome duplicado no MESMO tenant -> 400", dupA.status === 400, JSON.stringify(dupA.data));
const createFinanceiroB = await req("POST", "/groups", { name: "financeiro" }, tokB, "tenantb");
check("tenant B cria 'financeiro' -> 201", createFinanceiroB.status === 201, JSON.stringify(createFinanceiroB.data));
const createSameNameA = await req("POST", "/groups", { name: "financeiro" }, tokA, "tenanta");
check("tenant A cria 'financeiro' (nome igual ao de B) -> 201", createSameNameA.status === 201, JSON.stringify(createSameNameA.data));

// (a3) PUT cross-tenant -> 404
const putBFromA = await req("PUT", `/groups/${groupB1._id}`, { name: "invadir" }, tokA, "tenanta");
check("PUT grupo do tenant B a partir de A -> 404", putBFromA.status === 404, JSON.stringify(putBFromA.data));

// (a4) recipient-count — contagem só do tenant
const countA = await req("POST", "/groups/recipient-count", { targetGroups: [] }, tokA, "tenanta");
check("recipient-count broadcast A = 1", countA.data?.count === 1, JSON.stringify(countA.data));
const countB = await req("POST", "/groups/recipient-count", { targetGroups: [] }, tokB, "tenantb");
check("recipient-count broadcast B = 1", countB.data?.count === 1, JSON.stringify(countB.data));
const countAA = await req("POST", "/groups/recipient-count", { targetGroups: [String(groupA1._id)] }, tokA, "tenanta");
check("recipient-count direcionado A (operacoes) = 1", countAA.data?.count === 1, JSON.stringify(countAA.data));

// ===== INTERAÇÕES =====
// (b1) Colaborador A interage com post do próprio tenant -> 200 (persiste tenantId)
const interPostA = await req("PUT", `/interactions/${postA._id}`, { read: true }, tokColabA, "tenanta");
check("colab A marca leitura no post A -> 200", interPostA.status === 200, JSON.stringify(interPostA.data));
const interDoc = await Interaction.findOne({ postId: postA._id, userId: collabA._id }).lean();
check("interação persistida com tenantId de A", interDoc && String(interDoc.tenantId) === idA, JSON.stringify(interDoc?.tenantId));

// (b2) Colaborador A NÃO interage com post do tenant B -> 404 (isEligible)
const interPostB = await req("PUT", `/interactions/${postB._id}`, { read: true }, tokColabA, "tenanta");
check("colab A tenta interagir com post B -> 404", interPostB.status === 404, JSON.stringify(interPostB.data));
const noInterB = await Interaction.findOne({ postId: postB._id }).lean();
check("nenhuma interação criada em post B por A", noInterB == null, JSON.stringify(noInterB));

// (b3) GET /me — estado do próprio usuário, escopado
const meA = await req("GET", "/interactions/me", null, tokColabA, "tenanta");
check("GET /me contém post A", meA.status === 200 && !!meA.data?.[postA._id], JSON.stringify(meA.data));
check("GET /me NÃO contém post B", !meA.data?.[postB._id], JSON.stringify(meA.data));

// (b4) Métricas do admin escopadas por tenant
// Colaborador B também marca leitura no post B
const loginColabB = await req("POST", "/auth/login", { email: collabB.email, password: "senha123" }, null, "tenantb");
check("login colab B 200", loginColabB.status === 200);
const tokColabB = loginColabB.data.token;
await req("PUT", `/interactions/${postB._id}`, { read: true }, tokColabB, "tenantb");

const membersA = await req("GET", `/interactions/members?postId=${postA._id}`, null, tokA, "tenanta");
check("members A lista colab A", membersA.status === 200 && membersA.data.some((m) => String(m.user?.email) === collabA.email), JSON.stringify(membersA.data));

const summaryA = await req("GET", "/interactions/summary", null, tokA, "tenanta");
check(
  "summary A só contém post A (reads 1)",
  summaryA.data?.[postA._id]?.reads === 1 && !summaryA.data?.[postB._id],
  JSON.stringify(summaryA.data)
);
const summaryB = await req("GET", "/interactions/summary", null, tokB, "tenantb");
check(
  "summary B só contém post B (reads 1)",
  summaryB.data?.[postB._id]?.reads === 1 && !summaryB.data?.[postA._id],
  JSON.stringify(summaryB.data)
);

const aggA = await req("GET", `/interactions?postId=${postA._id}`, null, tokA, "tenanta");
check("GET /interactions?postId A -> totalReads 1", aggA.data?.totalReads === 1, JSON.stringify(aggA.data));
const detA = await req("GET", `/interactions/${postA._id}`, null, tokA, "tenanta");
check("GET /interactions/:postId A (admin) -> totalReads 1", detA.data?.totalReads === 1, JSON.stringify(detA.data));

// ===== CATEGORIAS =====
const catA = await req("GET", "/categories", null, tokA, "tenanta");
const catAIds = (catA.data ?? []).map((c) => c.id);
check(
  "categorias A = [geral, rh] (sem 'ti', 'noticias', 'todas')",
  catAIds.includes("geral") && catAIds.includes("rh") && !catAIds.includes("ti") && !catAIds.includes("noticias") && !catAIds.includes("todas"),
  JSON.stringify(catAIds)
);
const catB = await req("GET", "/categories", null, tokB, "tenantb");
const catBIds = (catB.data ?? []).map((c) => c.id);
check(
  "categorias B = [geral, ti, noticias] (sem 'rh')",
  catBIds.includes("geral") && catBIds.includes("ti") && catBIds.includes("noticias") && !catBIds.includes("rh"),
  JSON.stringify(catBIds)
);

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);
