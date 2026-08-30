import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";
import Comunicado from "../src/models/Comunicado.js";
import app from "../src/app.js";

// Teste de integração (Mongo real) da I-05 — Validade/expiração automática.
// Uso: npm run qa:i05  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const admin = await User.create({
  email: "admin.i05@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin I-05",
  role: "admin",
});
const collab = await User.create({
  email: "colab.i05@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab I-05",
  role: "colaborador",
  groupIds: [],
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

// 1) POST sem expiresAt → payload expiresAt null, expired false
const pNoExp = await req(
  "POST",
  "/posts",
  { title: "Sem validade I05", categoryId: "geral", body: ["Corpo A"] },
  adminTok
);
check("criar sem expiresAt", pNoExp.status === 201, JSON.stringify(pNoExp.data));
check("payload expiresAt null default", pNoExp.data.expiresAt === null, JSON.stringify(pNoExp.data));
check("payload expired false default", pNoExp.data.expired === false, JSON.stringify(pNoExp.data));

// 2) POST com expiresAt futuro → ISO no payload, expired false
const futureISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const pFut = await req(
  "POST",
  "/posts",
  { title: "Validade futura I05", categoryId: "geral", body: ["Corpo B"], expiresAt: futureISO },
  adminTok
);
check("criar com expiresAt futuro", pFut.status === 201, JSON.stringify(pFut.data));
check("payload expiresAt ISO futuro", pFut.data.expiresAt === futureISO, JSON.stringify(pFut.data));
check("payload expired false futuro", pFut.data.expired === false, JSON.stringify(pFut.data));

// 3) POST com expiresAt passado → aceito (201), expired true (expiração imediata)
const pastISO = new Date(Date.now() - 60 * 1000).toISOString();
const pExp = await req(
  "POST",
  "/posts",
  { title: "Expirado I05", categoryId: "geral", body: ["Corpo C"], expiresAt: pastISO },
  adminTok
);
check("criar com expiresAt passado aceito", pExp.status === 201, JSON.stringify(pExp.data));
check("payload expired true passado", pExp.data.expired === true, JSON.stringify(pExp.data));

// 4) expiresAt inválido → 400
const pInv = await req(
  "POST",
  "/posts",
  { title: "Inválido I05", categoryId: "geral", body: ["Corpo"], expiresAt: "nao-eh-data" },
  adminTok
);
check("POST expiresAt invalido 400", pInv.status === 400, `status=${pInv.status}`);

// 5) Colaborador: GET sem archive não vê expirado, vê não-expirados
const list = await req("GET", "/posts", null, collabTok);
const ids = list.data.map((p) => p.id);
check(
  "colaborador nao ve expirado sem archive",
  !ids.includes(pExp.data.id),
  JSON.stringify(ids)
);
check(
  "colaborador ve nao-expirados",
  ids.includes(pNoExp.data.id) && ids.includes(pFut.data.id),
  JSON.stringify(ids)
);

// 6) Colaborador: GET /:id de expirado → 404; de não-expirado → 200
const detailExp = await req("GET", `/posts/${pExp.data.id}`, null, collabTok);
check("GET /:id expirado 404 p/ colaborador", detailExp.status === 404, `status=${detailExp.status}`);
const detailFut = await req("GET", `/posts/${pFut.data.id}`, null, collabTok);
check("GET /:id nao-expirado 200", detailFut.status === 200, `status=${detailFut.status}`);

// 7) Arquivo (I-12): expirado não aparece nem em archive=archived
const pArch = await req(
  "POST",
  "/posts",
  { title: "Arquivado so I05", categoryId: "geral", body: ["Corpo D"] },
  adminTok
);
await backdate(pArch.data.id, 31);
const pExpArch = await req(
  "POST",
  "/posts",
  { title: "Arquivado expirado I05", categoryId: "geral", body: ["Corpo E"], expiresAt: pastISO },
  adminTok
);
await backdate(pExpArch.data.id, 31);
const archList = await req("GET", "/posts?archive=archived", null, collabTok);
const archIds = archList.data.map((p) => p.id);
check(
  "arquivo contem antigo nao-expirado",
  archIds.includes(pArch.data.id),
  JSON.stringify(archIds)
);
check(
  "arquivo nao contem expirado",
  !archIds.includes(pExpArch.data.id),
  JSON.stringify(archIds)
);

// 8) Admin: não filtra expirado; vê com expired true; acessa por id
const adminList = await req("GET", "/posts", null, adminTok);
const adminExp = adminList.data.find((p) => p.id === pExp.data.id);
check("admin ve expirado na listagem", Boolean(adminExp), JSON.stringify(adminList.data.map((p) => p.id)));
check("admin recebe expired true", adminExp?.expired === true, JSON.stringify(adminExp));
const adminDetail = await req("GET", `/posts/${pExp.data.id}`, null, adminTok);
check(
  "admin acessa expirado por id",
  adminDetail.status === 200 && adminDetail.data.expired === true,
  `status=${adminDetail.status} ${JSON.stringify(adminDetail.data)}`
);

// 9) Reativação: PUT expiresAt "" → limpa, mantém publicado, expired false
const react = await req("PUT", `/posts/${pExp.data.id}`, { expiresAt: "" }, adminTok);
check(
  "reativar limpa expiresAt",
  react.status === 200 && react.data.expiresAt === null && react.data.expired === false,
  `status=${react.status} ${JSON.stringify(react.data)}`
);
check("reativar mantem publicado", react.data.status === "publicado", JSON.stringify(react.data));
const list2 = await req("GET", "/posts", null, collabTok);
check(
  "colaborador volta a ver apos reativar",
  list2.data.some((p) => p.id === pExp.data.id),
  JSON.stringify(list2.data.map((p) => p.id))
);

// 10) PUT expiresAt inválido → 400 e não altera o campo
const badPut = await req("PUT", `/posts/${pNoExp.data.id}`, { expiresAt: "lixo" }, adminTok);
check("PUT expiresAt invalido 400", badPut.status === 400, `status=${badPut.status}`);
const afterBad = await req("GET", `/posts/${pNoExp.data.id}`, null, adminTok);
check("campo inalterado apos 400", afterBad.data.expiresAt === null, JSON.stringify(afterBad.data));

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);