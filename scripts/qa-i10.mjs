import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import Comunicado from "../src/models/Comunicado.js";
import Interaction from "../src/models/Interaction.js";
import app from "../src/app.js";

// Teste de integração (Mongo real) da I-10 — Paginação por cursor + ordenação inteligente.
// Uso: npm run qa:i10  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const admin = await User.create({
  email: "admin.i10@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin I-10",
  role: "admin",
});
const collab = await User.create({
  email: "colab.i10@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab I-10",
  role: "colaborador",
  groupIds: [],
});

const server = app.listen(4010);
const base = "http://localhost:4010/api";

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

async function createPost(extra) {
  const r = await req(
    "POST",
    "/posts",
    { title: "Titulo " + Math.random().toString(36).slice(2), categoryId: "geral", body: ["Corpo"], ...extra },
    adminTok
  );
  return r.data;
}

// Posts com características controladas para validar a ordenação inteligente.
const pA = await createPost({}); // recente, comum
const pB = await createPost({ urgent: true }); // recente, urgente (não fixado)
const pC = await createPost({}); // fixado (vence urgência e recência)
await backdate(pC.id, 5); // pC fixado e mais antigo
const pD = await createPost({}); // comum
await backdate(pD.id, 10); // pD antigo
const pAId = pA.id;

// Marca pA como lido para o colaborador (não lido deve vencer lido).
await Interaction.create({ postId: pAId, userId: collab._id, read: true, readAt: new Date() });
await req("PUT", `/posts/${pC.id}`, { pinned: true }, adminTok);

// 1) Envelope na primeira página com limit
const p1 = await req("GET", "/posts?limit=2", null, collabTok);
check(
  "primeira pagina envelope",
  p1.status === 200 && Array.isArray(p1.data?.items) && p1.data?.items.length === 2 &&
    typeof p1.data?.hasMore === "boolean" && "nextCursor" in p1.data,
  JSON.stringify(p1.data)
);
check("primeira pagina hasMore true", p1.data.hasMore === true);
const order1 = p1.data.items.map((p) => p.id);
check(
  "fixado vence urgente (pC e pB no topo)",
  order1[0] === pC.id && order1[1] === pB.id,
  JSON.stringify(order1)
);

// 2) Próxima página via cursor não duplica
const p2 = await req("GET", `/posts?limit=2&cursor=${p1.data.nextCursor}`, null, collabTok);
check("pagina 2 status 200", p2.status === 200);
const seen = new Set([...order1]);
check("pagina 2 nao duplica pagina 1", p2.data.items.every((p) => !seen.has(p.id)));
const order2 = p2.data.items.map((p) => p.id);
check("pagina 2 ordena nao lido antes de lido", p2.data.items.some((p) => p.id === pD.id));

// 3) Percorre até o fim: última página hasMore=false e nextCursor=null
let lastPage = p2.data;
let cur = p2.data.nextCursor;
let guard = 0;
while (cur && guard++ < 20) {
  const pg = await req("GET", `/posts?limit=2&cursor=${cur}`, null, collabTok);
  lastPage = pg.data;
  cur = pg.data.nextCursor;
}
check(
  "ultima pagina hasMore false e cursor null",
  lastPage && lastPage.hasMore === false && lastPage.nextCursor === null,
  JSON.stringify(lastPage)
);

// 4) Sem parâmetros → array simples (retrocompatível)
const all = await req("GET", "/posts", null, collabTok);
check("sem params retorna array", all.status === 200 && Array.isArray(all.data), JSON.stringify(all.data));
check("sem params inclui todos os posts", all.data.length === 4, `len=${Array.isArray(all.data) ? all.data.length : "NA"}`);

// 5) limit inválido → 400
for (const lq of ["0", "abc", "-1", "20.5", "101"]) {
  const r = await req("GET", `/posts?limit=${lq}`, null, collabTok);
  check(`limit ${lq} -> 400`, r.status === 400, `status=${r.status}`);
}

// 6) cursor inválido / recorte divergente → 400
const badCursor = await req("GET", "/posts?limit=2&cursor=@@bad@@", null, collabTok);
check("cursor indecifravel -> 400", badCursor.status === 400, `status=${badCursor.status}`);
const adminCursor = await req("GET", "/posts?limit=2", null, adminTok);
const diverged = await req("GET", `/posts?limit=2&cursor=${adminCursor.data.nextCursor}`, null, collabTok);
check("cursor de outra janela -> 400", diverged.status === 400, `status=${diverged.status}`);

// 7) Busca paginada
const searchPage = await req("GET", "/posts?search=Titulo&limit=2", null, collabTok);
check(
  "busca paginada envelope",
  searchPage.status === 200 && Array.isArray(searchPage.data?.items) && searchPage.data?.items.length === 2,
  JSON.stringify(searchPage.data)
);

// 8) Admin paga com envelope e mantém a visibilidade (só o que publicou)
const adminPage = await req("GET", "/posts?limit=2", null, adminTok);
check(
  "admin pagina envelope",
  adminPage.status === 200 && Array.isArray(adminPage.data?.items) && adminPage.data?.items.length === 2,
  JSON.stringify(adminPage.data)
);
check("admin nao usa ordenacao inteligente (pinned primeiro)", adminPage.data.items[0].id === pC.id);

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);
