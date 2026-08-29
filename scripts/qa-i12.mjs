import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import Group from "../src/models/Group.js";
import Comunicado from "../src/models/Comunicado.js";
import app from "../src/app.js";

// Teste de integração (Mongo real) da I-12 — Arquivo/histórico de comunicados antigos.
// Uso: npm run qa:i12  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const OLD_DAYS = 40;

const groupA = await Group.create({ name: "Grupo A I12" });
const groupB = await Group.create({ name: "Grupo B I12" });

const admin = await User.create({
  email: "admin.i12@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin I-12",
  role: "admin",
});
const collab = await User.create({
  email: "colab.i12@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab I-12",
  role: "colaborador",
  groupIds: [String(groupA._id)],
});

const server = app.listen(4008);
const base = "http://localhost:4008/api";

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
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

async function backdate(postId, daysAgo) {
  await Comunicado.updateOne(
    { _id: postId },
    { $set: { dateISO: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000) } }
  );
}

const adminLogin = await req("POST", "/auth/login", {
  email: admin.email,
  password: "senha123",
});
const collabLogin = await req("POST", "/auth/login", {
  email: collab.email,
  password: "senha123",
});
check("login admin", adminLogin.status === 200);
check("login colaborador", collabLogin.status === 200);
const adminTok = adminLogin.data.token;
const collabTok = collabLogin.data.token;

// Posts: broadcast recente, broadcast antigo, direcionado A antigo, direcionado B antigo
const pRecent = await req(
  "POST",
  "/posts",
  { title: "Comunicado recente I12", categoryId: "geral", body: ["Corpo"] },
  adminTok
);
check("criar post recente", pRecent.status === 201, JSON.stringify(pRecent.data));

const pBroadcastOld = await req(
  "POST",
  "/posts",
  { title: "Comunicado arquivado antigo", categoryId: "rh", body: ["Corpo"] },
  adminTok
);
const pTargetAOld = await req(
  "POST",
  "/posts",
  {
    title: "Comunicado direcionado A antigo",
    categoryId: "ti",
    body: ["Corpo"],
    targetGroups: [String(groupA._id)],
  },
  adminTok
);
const pTargetBOld = await req(
  "POST",
  "/posts",
  {
    title: "Comunicado direcionado B antigo",
    categoryId: "beneficios",
    body: ["Corpo"],
    targetGroups: [String(groupB._id)],
  },
  adminTok
);
await backdate(pBroadcastOld.data.id, OLD_DAYS);
await backdate(pTargetAOld.data.id, OLD_DAYS);
await backdate(pTargetBOld.data.id, OLD_DAYS);

// 1) Sem parâmetro retorna todos os elegíveis do colaborador (broadcast + direcionado A)
const all = await req("GET", "/posts", null, collabTok);
check("sem parametro retorna todos", all.data.length === 3, JSON.stringify(all.data.map((p) => p.id)));

// 2) ?archive=active retorna só recentes
const active = await req("GET", "/posts?archive=active", null, collabTok);
check(
  "archive active so recentes",
  active.data.length === 1 && active.data[0].id === pRecent.data.id,
  JSON.stringify(active.data.map((p) => p.id))
);

// 3) ?archive=archived retorna só antigos visíveis
const archived = await req("GET", "/posts?archive=archived", null, collabTok);
const archivedIds = archived.data.map((p) => p.id).sort();
check(
  "archive archived so antigos visiveis",
  archived.data.length === 2 &&
    archivedIds.includes(pBroadcastOld.data.id) &&
    archivedIds.includes(pTargetAOld.data.id) &&
    !archivedIds.includes(pTargetBOld.data.id),
  JSON.stringify(archivedIds)
);

// 4) Busca funciona dentro do arquivo
const search = await req("GET", "/posts?archive=archived&search=arquivado", null, collabTok);
check(
  "busca dentro do arquivo",
  search.data.length === 1 && search.data[0].id === pBroadcastOld.data.id,
  JSON.stringify(search.data.map((p) => p.id))
);

// 5) Visibilidade por grupo funciona dentro do arquivo
const groupFilt = await req(
  "GET",
  `/posts?archive=archived&groupId=${String(groupA._id)}`,
  null,
  collabTok
);
const gfIds = groupFilt.data.map((p) => p.id).sort();
check(
  "groupId respeita visibilidade no arquivo",
  groupFilt.data.length === 2 &&
    gfIds.includes(pBroadcastOld.data.id) &&
    gfIds.includes(pTargetAOld.data.id) &&
    !gfIds.includes(pTargetBOld.data.id),
  JSON.stringify(gfIds)
);

// 6) Grupo ao qual não pertence → 403 mesmo dentro do arquivo
const forbidden = await req(
  "GET",
  `/posts?archive=archived&groupId=${String(groupB._id)}`,
  null,
  collabTok
);
check("groupId sem permissao 403", forbidden.status === 403, `status=${forbidden.status}`);

// 7) Admin ignora ?archive: vê o que publicou (recente + antigos próprios), sem separação por idade
const adminAll = await req("GET", "/posts", null, adminTok);
const adminArchived = await req("GET", "/posts?archive=archived", null, adminTok);
check("admin ignora archive (mesmo conjunto)", adminArchived.data.length === adminAll.data.length);
check(
  "admin ve o que publicou com archive",
  adminArchived.data.length === 4,
  JSON.stringify(adminArchived.data.map((p) => p.id))
);

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);