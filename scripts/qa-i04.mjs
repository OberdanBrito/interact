import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import Comunicado from "../src/models/Comunicado.js";
import app from "../src/app.js";

// Teste de integração (Mongo real) da I-04 — Fixar comunicado importante.
// Uso: npm run qa:i04  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const admin = await User.create({
  email: "admin.i04@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin I-04",
  role: "admin",
});
const collab = await User.create({
  email: "colab.i04@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab I-04",
  role: "colaborador",
  groupIds: [],
});

const server = app.listen(4009);
const base = "http://localhost:4009/api";

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

// 1) POST sem pinned → pinned: false no payload
const pA = await req(
  "POST",
  "/posts",
  { title: "Comunicado A I04", categoryId: "geral", body: ["Corpo A"] },
  adminTok
);
check("criar post A", pA.status === 201, JSON.stringify(pA.data));
check("payload expoe pinned default false", pA.data.pinned === false, JSON.stringify(pA.data));

// 2) PUT pinned true em publicado → 200, pinned true
const pinA = await req("PUT", `/posts/${pA.data.id}`, { pinned: true }, adminTok);
check(
  "fixar publicado ok",
  pinA.status === 200 && pinA.data.pinned === true,
  `status=${pinA.status} pinned=${pinA.data?.pinned}`
);

// 3) PUT pinned true em rascunho → 400 com mensagem; permanece false
const pDraft = await req(
  "POST",
  "/posts",
  { title: "", categoryId: "geral", status: "draft" },
  adminTok
);
check("criar rascunho", pDraft.status === 201, JSON.stringify(pDraft.data));
const pinDraft = await req("PUT", `/posts/${pDraft.data.id}`, { pinned: true }, adminTok);
check(
  "fixar rascunho 400",
  pinDraft.status === 400 &&
    pinDraft.data?.error === "Apenas comunicados publicados podem ser fixados",
  `status=${pinDraft.status} ${JSON.stringify(pinDraft.data)}`
);
const draftCheck = await req("GET", `/posts/${pDraft.data.id}`, null, adminTok);
check("rascunho continua nao fixado", draftCheck.data.pinned === false);

// 4) PUT pinned true em agendado → 400
const pSched = await req(
  "POST",
  "/posts",
  { title: "Agendado I04", categoryId: "geral", body: ["Corpo"], publishAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
  adminTok
);
check("criar agendado", pSched.status === 201, JSON.stringify(pSched.data));
const pinSched = await req("PUT", `/posts/${pSched.data.id}`, { pinned: true }, adminTok);
check(
  "fixar agendado 400",
  pinSched.status === 400 && pinSched.data?.error === "Apenas comunicados publicados podem ser fixados",
  `status=${pinSched.status}`
);

// 5) Ordenação: fixado vence mesmo sendo mais antigo que um não-fixado
const pB = await req(
  "POST",
  "/posts",
  { title: "Comunicado B I04", categoryId: "geral", body: ["Corpo B"] },
  adminTok
);
await backdate(pA.data.id, 10); // A (fixado) publicado há 10 dias; B (não fixado) agora
const list = await req("GET", "/posts", null, collabTok);
check(
  "GET ordena pinned primeiro",
  list.data[0].id === pA.data.id && list.data[1].id === pB.data.id,
  JSON.stringify(list.data.map((p) => `${p.id}(pin=${p.pinned})`))
);

// 6) Múltiplos pinned ordenados por recência (dateISO desc) e antes dos não-fixados.
//    Aqui A, B e C estão fixados; D (não-fixado) serve de controle.
const pC = await req(
  "POST",
  "/posts",
  { title: "Comunicado C I04", categoryId: "geral", body: ["Corpo C"] },
  adminTok
);
const pD = await req(
  "POST",
  "/posts",
  { title: "Comunicado D I04 (nao fixado)", categoryId: "geral", body: ["Corpo D"] },
  adminTok
);
await backdate(pC.data.id, 2); // C (fixado em seguida) mais antigo que B
await req("PUT", `/posts/${pB.data.id}`, { pinned: true }, adminTok);
await req("PUT", `/posts/${pC.data.id}`, { pinned: true }, adminTok);
const list2 = await req("GET", "/posts", null, collabTok);
const pinnedOrder = list2.data.filter((p) => p.pinned).map((p) => p.id);
check(
  "multiplicos pinned por recencia",
  pinnedOrder[0] === pB.data.id && pinnedOrder[1] === pC.data.id && pinnedOrder[2] === pA.data.id,
  JSON.stringify(pinnedOrder)
);
check(
  "pinned todos antes dos nao-fixados",
  list2.data.slice(0, 3).every((p) => p.pinned) && !list2.data.slice(3).some((p) => p.pinned),
  JSON.stringify(list2.data.map((p) => `${p.id}(pin=${p.pinned})`))
);
check(
  "nao-fixado fica no fim",
  list2.data[list2.data.length - 1].id === pD.data.id,
  JSON.stringify(list2.data.map((p) => p.id))
);

// 7) Desfixar → 200; permanecem fixados A e C (recência: C antes de A)
const unpinB = await req("PUT", `/posts/${pB.data.id}`, { pinned: false }, adminTok);
check("desfixar ok", unpinB.status === 200 && unpinB.data.pinned === false);
const list3 = await req("GET", "/posts", null, collabTok);
const pinnedAfter = list3.data.filter((p) => p.pinned).map((p) => p.id);
check(
  "apos desfixar sobram A e C por recencia",
  pinnedAfter.length === 2 && pinnedAfter[0] === pC.data.id && pinnedAfter[1] === pA.data.id,
  JSON.stringify(pinnedAfter)
);
check(
  "desfixado volta para o grupo por data",
  list3.data.filter((p) => !p.pinned)[0].id === pD.data.id,
  JSON.stringify(list3.data.map((p) => `${p.id}(pin=${p.pinned})`))
);

// 8) Admin também recebe ordenação pinned primeiro
const adminList = await req("GET", "/posts", null, adminTok);
const adminPinned = adminList.data.filter((p) => p.pinned).map((p) => p.id);
check(
  "admin recebe pinned primeiro",
  adminPinned.length === 2 && adminPinned[0] === pC.data.id && adminPinned[1] === pA.data.id,
  JSON.stringify(adminPinned)
);

// 9) GET /:id expõe pinned
const detail = await req("GET", `/posts/${pC.data.id}`, null, collabTok);
check("GET /:id expoe pinned", detail.data.pinned === true);

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);