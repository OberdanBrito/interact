import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import Interaction from "../src/models/Interaction.js";
import Comunicado from "../src/models/Comunicado.js";
import app from "../src/app.js";

// Teste de integração (Mongo real) da I-11 — Marcar como não-lido.
// Uso: npm run test:integration  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const admin = await User.create({
  email: "admin.i11@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin I-11",
  role: "admin",
});
const collab = await User.create({
  email: "colab.i11@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab I-11",
  role: "colaborador",
});

const server = app.listen(4007);
const base = "http://localhost:4007/api";

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

// 1) Criar comunicado publicado (broadcast) para interagir
const pub = await req(
  "POST",
  "/posts",
  {
    title: "Comunicado I-11",
    categoryId: "geral",
    body: ["Corpo"],
    author: { name: "Admin", role: "Gestão" },
    status: "published",
  },
  adminTok
);
check("criar comunicado publicado", pub.status === 201, JSON.stringify(pub.data));
const postId = pub.data.id;

// 2) Colaborador confirma leitura (read: true) — readAt preenchido
const r1 = await req("PUT", `/interactions/${postId}`, { read: true }, collabTok);
check("confirmar leitura 200", r1.status === 200, JSON.stringify(r1.data));
check("confirmar leitura read true", r1.data?.read === true, JSON.stringify(r1.data));
const doc1 = await Interaction.findOne({ postId, userId: collab._id }).lean();
check(
  "readAt preenchido apos ler",
  doc1 && doc1.read === true && doc1.readAt instanceof Date,
  JSON.stringify(doc1)
);

// 3) Reverter leitura (read: false) — readAt limpo (null)
const r2 = await req("PUT", `/interactions/${postId}`, { read: false }, collabTok);
check("reverter leitura 200", r2.status === 200, JSON.stringify(r2.data));
check("reverter leitura read false", r2.data?.read === false, JSON.stringify(r2.data));
const doc2 = await Interaction.findOne({ postId, userId: collab._id }).lean();
check(
  "readAt null apos reverter",
  doc2 && doc2.read === false && doc2.readAt === null,
  JSON.stringify(doc2)
);

// 4) read: false sem documento prévio — upsert cria read false + readAt null
const collab2 = await User.create({
  email: "colab2.i11@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab2 I-11",
  role: "colaborador",
});
const collab2Login = await req("POST", "/auth/login", {
  email: collab2.email,
  password: "senha123",
});
const r3 = await req(
  "PUT",
  `/interactions/${postId}`,
  { read: false },
  collab2Login.data.token
);
check("reverter sem doc previo 200", r3.status === 200, JSON.stringify(r3.data));
const doc3 = await Interaction.findOne({ postId, userId: collab2._id }).lean();
check(
  "upsert read false readAt null",
  doc3 && doc3.read === false && doc3.readAt === null,
  JSON.stringify(doc3)
);

// 5) Re-confirmar leitura — readAt preenchido de novo
const r4 = await req("PUT", `/interactions/${postId}`, { read: true }, collabTok);
const doc4 = await Interaction.findOne({ postId, userId: collab._id }).lean();
check(
  "re-ler readAt preenchido de novo",
  r4.data?.read === true && doc4.readAt instanceof Date,
  JSON.stringify(doc4)
);

// 6) GET /api/interactions/members reflete a reversão (colab2 está read:false/readAt:null)
const members = await req(
  "GET",
  `/interactions/members?postId=${postId}`,
  null,
  adminTok
);
const mColab2 = (members.data || []).find((m) => m.user?.email === collab2.email);
check("members lista colab2", Boolean(mColab2), JSON.stringify(members.data));
check(
  "members colab2 read false + readAt null",
  mColab2 && mColab2.read === false && mColab2.readAt === null,
  JSON.stringify(mColab2)
);

// 7) Agregado GET /api/interactions?postId= conta pelo booleano read (não afetado)
const agg = await req(
  "GET",
  `/interactions?postId=${postId}`,
  null,
  adminTok
);
check("agregado totalReads conta so read true", agg.data?.totalReads === 1, JSON.stringify(agg.data));

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);