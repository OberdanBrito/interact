import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import path from "node:path";
import { stat } from "node:fs/promises";
import User from "../src/models/User.js";
import Group from "../src/models/Group.js";
import Tenant from "../src/models/Tenant.js";
import Comunicado from "../src/models/Comunicado.js";
import app from "../src/app.js";
import { UPLOAD_DIR, MAX_COVER_MB } from "../src/upload.js";

// Teste de integração (Mongo real) da I-16 — Imagem de capa nos cards do feed.
// Uso: npm run qa:i16  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const tenantA = await Tenant.create({ slug: "tenanta16", name: "Tenant A" });
const tenantB = await Tenant.create({ slug: "tenantb16", name: "Tenant B" });

const adminA = await User.create({
  email: "i16-admin-a@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin I-16 A",
  role: "admin",
  tenantId: tenantA._id,
});
const adminB = await User.create({
  email: "i16-admin-b@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin I-16 B",
  role: "admin",
  tenantId: tenantB._id,
});
const collabA = await User.create({
  email: "i16-collab-a@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab I-16 A",
  role: "colaborador",
  groupIds: [],
  tenantId: tenantA._id,
});
const collabB = await User.create({
  email: "i16-collab-b@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab I-16 B",
  role: "colaborador",
  groupIds: [],
  tenantId: tenantB._id,
});
const groupTi = await Group.create({
  name: "ti-qa-i16",
  active: true,
  tenantId: tenantA._id,
});

const server = app.listen(4029);
const base = "http://localhost:4029/api";

const IMG_PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 0),
]);
const plainBuffer = Buffer.from("apenas texto");
const PDF_BYTES = Buffer.from("%PDF-1.4\ntrailer<</Root 1 0 R>>\n%%EOF");

async function req(method, pathName, body, token, tenantSlug) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;
  const res = await fetch(`${base}${pathName}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

async function uploadCover(pathName, fileName, fileType, buffer, token, tenantSlug) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: fileType }), fileName);
  const headers = { Authorization: `Bearer ${token}` };
  if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;
  const res = await fetch(`${base}${pathName}`, {
    method: "POST",
    headers,
    body: form,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function download(pathName, token, tenantSlug) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;
  const res = await fetch(`${base}${pathName}`, {
    headers,
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get("content-type"), body: buf };
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

function resolveUpload(dirName) {
  return path.resolve(UPLOAD_DIR, dirName);
}

const loginA = await req("POST", "/auth/login", { email: adminA.email, password: "senha123" }, null, "tenanta16");
const loginB = await req("POST", "/auth/login", { email: adminB.email, password: "senha123" }, null, "tenantb16");
const loginColabA = await req("POST", "/auth/login", { email: collabA.email, password: "senha123" }, null, "tenanta16");
const loginColabB = await req("POST", "/auth/login", { email: collabB.email, password: "senha123" }, null, "tenantb16");
check("login admin A", loginA.status === 200);
check("login admin B", loginB.status === 200);
check("login colaborador A", loginColabA.status === 200);
check("login colaborador B", loginColabB.status === 200);
const tokA = loginA.data.token;
const tokB = loginB.data.token;
const tokColabA = loginColabA.data.token;
const tokColabB = loginColabB.data.token;

// Pré-condição: comunicado broadcast (colaborador A elegível)
const pBroadcast = await req(
  "POST",
  "/posts",
  { title: "Com capa I16", categoryId: "geral", body: ["Corpo"], targetGroups: [] },
  tokA,
  "tenanta16"
);
check("criar comunicado broadcast", pBroadcast.status === 201);
const pbId = pBroadcast.data.id;

// Direcionado a grupo que collab A não pertence (não-elegível)
const pTargeted = await req(
  "POST",
  "/posts",
  { title: "Capa alvo I16", categoryId: "geral", body: ["Corpo"], targetGroups: [String(groupTi._id)] },
  tokA,
  "tenanta16"
);
check("criar comunicado direcionado", pTargeted.status === 201);
const ptId = pTargeted.data.id;

// Rascunho (invisível ao colaborador)
const pDraft = await req(
  "POST",
  "/posts",
  { title: "Capa rascunho I16", categoryId: "geral", body: ["Corpo"], status: "draft" },
  tokA,
  "tenanta16"
);
check("criar rascunho", pDraft.status === 201);
const pdId = pDraft.data.id;

// Sem capa: payload null + GET 404
const getNoCapa = await req("GET", `/posts/${pbId}`, null, tokA, "tenanta16");
check("sem capa → coverImage null", getNoCapa.data.coverImage === null, JSON.stringify(getNoCapa.data));
const dlNoCapa = await download(`/posts/${pbId}/cover-image`, tokColabA, "tenanta16");
check("GET capa inexistente → 404", dlNoCapa.status === 404);

console.log("1) Upload de capa válida (PNG)");
const upOk = await uploadCover(`/posts/${pbId}/cover-image`, "capa.png", "image/png", IMG_PNG, tokA, "tenanta16");
check("upload 201", upOk.status === 201, JSON.stringify(upOk.data));
check("payload expõe URL da capa", upOk.data.coverImage === `/api/posts/${pbId}/cover-image`, JSON.stringify(upOk.data));
const getWith = await req("GET", `/posts/${pbId}`, null, tokA, "tenanta16");
check("toPost expõe coverImage URL", getWith.data.coverImage === `/api/posts/${pbId}/cover-image`, JSON.stringify(getWith.data));

console.log("2) GET capa por colaborador elegível (broadcast)");
const dlOk = await download(`/posts/${pbId}/cover-image`, tokColabA, "tenanta16");
check("GET 200", dlOk.status === 200);
check("content-type image/png", dlOk.type === "image/png", dlOk.type);
check("binário íntegro", dlOk.body.equals(IMG_PNG));

console.log("3) GET capa por colaborador não-elegível (direcionado)");
const upT = await uploadCover(`/posts/${ptId}/cover-image`, "sigilo.png", "image/png", IMG_PNG, tokA, "tenanta16");
check("upload capa no direcionado 201", upT.status === 201);
const dlT = await download(`/posts/${ptId}/cover-image`, tokColabA, "tenanta16");
check("não-elegível → 404", dlT.status === 404);
const getT = await req("GET", `/posts/${ptId}`, null, tokColabA, "tenanta16");
check("post direcionado → 404 para colaborador A", getT.status === 404);

console.log("4) Capa em rascunho (invisível ao colaborador)");
const upD = await uploadCover(`/posts/${pdId}/cover-image`, "rascunho.png", "image/png", IMG_PNG, tokA, "tenanta16");
check("upload capa em rascunho 201", upD.status === 201);
const dlD = await download(`/posts/${pdId}/cover-image`, tokColabA, "tenanta16");
check("rascunho → 404 para colaborador", dlD.status === 404);

console.log("5) Limites: tamanho e tipo");
const upBig = await uploadCover(`/posts/${pbId}/cover-image`, "grande.png", "image/png", Buffer.alloc((MAX_COVER_MB + 1) * 1024 * 1024, 0), tokA, "tenanta16");
check(`capa acima de ${MAX_COVER_MB}MB → 400`, upBig.status === 400, JSON.stringify(upBig.data));
const upText = await uploadCover(`/posts/${pbId}/cover-image`, "nota.txt", "text/plain", plainBuffer, tokA, "tenanta16");
check("tipo texto → 400", upText.status === 400, JSON.stringify(upText.data));
const upPdf = await uploadCover(`/posts/${pbId}/cover-image`, "doc.pdf", "application/pdf", PDF_BYTES, tokA, "tenanta16");
check("pdf não é capa → 400", upPdf.status === 400, JSON.stringify(upPdf.data));

console.log("6) Substituição de capa remove binário antigo");
const upCapa1 = await uploadCover(`/posts/${pbId}/cover-image`, "capa1.png", "image/png", IMG_PNG, tokA, "tenanta16");
const doc1 = await Comunicado.findById(pbId).lean();
const file1 = resolveUpload(doc1.coverImage);
const existed1 = await stat(file1).then(() => true).catch(() => false);
check("binário da capa existe no disco", existed1);
const upCapa2 = await uploadCover(`/posts/${pbId}/cover-image`, "capa2.png", "image/png", IMG_PNG, tokA, "tenanta16");
const doc2 = await Comunicado.findById(pbId).lean();
const existed1After = await stat(file1).then(() => true).catch(() => false);
const existed2 = await stat(resolveUpload(doc2.coverImage)).then(() => true).catch(() => false);
check("capa antiga removida do disco", existed1 && !existed1After);
check("nova capa gravada", existed2);
check("filename novo != antigo", doc1.coverImage !== doc2.coverImage, `${doc1.coverImage} vs ${doc2.coverImage}`);

console.log("7) DELETE capa");
const dCapa = await req("DELETE", `/posts/${pbId}/cover-image`, null, tokA, "tenanta16");
check("DELETE capa 200", dCapa.status === 200, JSON.stringify(dCapa.data));
check("payload coverImage null", dCapa.data.coverImage === null);
const docAfterDelete = await Comunicado.findById(pbId).lean();
check("campo limpo no banco", docAfterDelete.coverImage === null);
const existedAfterDelete = await stat(resolveUpload(doc2.coverImage)).then(() => true).catch(() => false);
check("binário removido do disco", existed2 && !existedAfterDelete);
const getAfterDelete = await req("GET", `/posts/${pbId}`, null, tokA, "tenanta16");
check("toPost após DELETE → coverImage null", getAfterDelete.data.coverImage === null);

console.log("8) Excluir post remove capa do disco");
const upCapa3 = await uploadCover(`/posts/${ptId}/cover-image`, "capa3.png", "image/png", IMG_PNG, tokA, "tenanta16");
const docTargeted = await Comunicado.findById(ptId).lean();
const capaTargeted = resolveUpload(docTargeted.coverImage);
const existedTargeted = await stat(capaTargeted).then(() => true).catch(() => false);
check("arquivo existia antes", existedTargeted);
const delPt = await req("DELETE", `/posts/${ptId}`, null, tokA, "tenanta16");
check("excluir post 200/204", delPt.status === 200 || delPt.status === 204);
const existsAfter = await stat(capaTargeted).then(() => true).catch(() => false);
check("capa removida ao excluir post", existedTargeted && !existsAfter);

console.log("9) Colaborador não pode enviar capa");
const upNoAuth = await uploadCover(`/posts/${pbId}/cover-image`, "x.png", "image/png", IMG_PNG, tokColabA, "tenanta16");
check("colaborador → 403", upNoAuth.status === 403, JSON.stringify(upNoAuth.data));

console.log("10) Escopo por tenant (cross-tenant)");
await uploadCover(`/posts/${pbId}/cover-image`, "pos-delete.png", "image/png", IMG_PNG, tokA, "tenanta16");
const upCross = await uploadCover(`/posts/${pbId}/cover-image`, "invade.png", "image/png", IMG_PNG, tokB, "tenantb16");
check("admin B POST capa em post de A → 404", upCross.status === 404, JSON.stringify(upCross.data));
const dlCross = await download(`/posts/${pbId}/cover-image`, tokColabB, "tenantb16");
check("collab B GET capa de post de A → 404", dlCross.status === 404);
const delCross = await req("DELETE", `/posts/${pbId}/cover-image`, null, tokB, "tenantb16");
check("admin B DELETE capa de post de A → 404", delCross.status === 404, JSON.stringify(delCross.data));
const stillOk = await req("GET", `/posts/${pbId}`, null, tokA, "tenanta16");
check("capa de A intacta após tentativas de B", stillOk.data.coverImage === `/api/posts/${pbId}/cover-image`);

server.close();
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);