import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { stat } from "node:fs/promises";
import User from "../src/models/User.js";
import Comunicado from "../src/models/Comunicado.js";
import Group from "../src/models/Group.js";
import app from "../src/app.js";

// Teste de integração (Mongo real) da I-03 — Anexos e imagens.
// Uso: npm run qa:i03  (sobe o Mongo via docker-compose antes)
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const admin = await User.create({
  email: "admin.i03@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin I-03",
  role: "admin",
});
const collab = await User.create({
  email: "colab.i03@interactcorp.com.br",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Colab I-03",
  role: "colaborador",
  groupIds: [],
});
const groupTi = await Group.create({
  name: "ti-qa-i03",
  active: true,
});

const server = app.listen(4009);
const base = "http://localhost:4009/api";

const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
const IMG_PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 0),
]);
const plainBuffer = Buffer.from("apenas texto");

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

async function upload(path, fileName, fileType, buffer, token) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: fileType }), fileName);
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function download(path, token) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
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

// Pré-condição: comunicado broadcast (colaborador elegível)
const pBroadcast = await req(
  "POST",
  "/posts",
  { title: "Com broadcast I03", categoryId: "geral", body: ["Corpo"], targetGroups: [] },
  adminTok
);
check("criar comunicado broadcast", pBroadcast.status === 201);
const pbId = pBroadcast.data.id;

// Comunicado direcionado a um grupo que o colaborador não pertence
const pTargeted = await req(
  "POST",
  "/posts",
  { title: "Com alvo I03", categoryId: "geral", body: ["Corpo"], targetGroups: [String(groupTi._id)] },
  adminTok
);
check("criar comunicado direcionado", pTargeted.status === 201);
const ptId = pTargeted.data.id;

// Rascunho com anexo (invisível ao colaborador)
const pDraft = await req(
  "POST",
  "/posts",
  { title: "Rascunho I03", categoryId: "geral", body: ["Corpo"], status: "draft" },
  adminTok
);
check("criar rascunho", pDraft.status === 201);
const pdId = pDraft.data.id;

console.log("1) Upload de anexo válido");
const upOk = await upload(`/posts/${pbId}/attachments`, "relatorio.pdf", "application/pdf", PDF_BYTES, adminTok);
check("upload 201", upOk.status === 201, JSON.stringify(upOk.data));
check("metadados: name/type/size/url", upOk.data.name === "relatorio.pdf" && upOk.data.type === "application/pdf" && upOk.data.size === PDF_BYTES.length && upOk.data.url.includes(`/posts/${pbId}/attachments/`));
const attOkId = upOk.data.id;

console.log("2) GET anexo por colaborador elegível (broadcast)");
const dlOk = await download(`/posts/${pbId}/attachments/${attOkId}`, collabTok);
check("download 200", dlOk.status === 200);
check("content-type pdf", dlOk.type === "application/pdf");
check("binário íntegro", dlOk.body.equals(PDF_BYTES));

console.log("3) GET anexo por colaborador não-elegível (direcionado)");
const upT = await upload(`/posts/${ptId}/attachments`, "sigilo.pdf", "application/pdf", PDF_BYTES, adminTok);
const attTId = upT.data.id;
const dlT = await download(`/posts/${ptId}/attachments/${attTId}`, collabTok);
check("não-elegível → 404", dlT.status === 404);
const getT = await req("GET", `/posts/${ptId}`, null, collabTok);
check("post direcionado → 404 para colaborador", getT.status === 404);

console.log("4) Anexo inexistente → 404");
const dlMissing = await download(`/posts/${pbId}/attachments/nao-existe.pdf`, adminTok);
check("anexo inexistente → 404", dlMissing.status === 404);

console.log("5) attachments: [] para comunicado sem anexo");
const pNoAtt = await req(
  "POST",
  "/posts",
  { title: "Sem anexo I03", categoryId: "geral", body: ["Corpo"], targetGroups: [] },
  adminTok
);
check("payload attachments [] (não null)", Array.isArray(pNoAtt.data.attachments) && pNoAtt.data.attachments.length === 0, JSON.stringify(pNoAtt.data.attachments));

console.log("6) Limites: tamanho e tipo");
const upBig = await upload(`/posts/${pbId}/attachments`, "grande.pdf", "application/pdf", Buffer.alloc(11 * 1024 * 1024, 0), adminTok);
check("arquivo acima do limite → 400", upBig.status === 400, JSON.stringify(upBig.data));
const upType = await upload(`/posts/${pbId}/attachments`, "nota.txt", "text/plain", plainBuffer, adminTok);
check("tipo não permitido → 400", upType.status === 400, JSON.stringify(upType.data));

console.log("7) Imagem permitida (PNG)");
const upImg = await upload(`/posts/${pbId}/attachments`, "foto.png", "image/png", IMG_PNG, adminTok);
check("imagem png → 201", upImg.status === 201, JSON.stringify(upImg.data));

console.log("8) Remoção de anexo");
const before = (await req("GET", `/posts/${pbId}`, null, adminTok)).data.attachments.length;
const dAtt = await req("DELETE", `/posts/${pbId}/attachments/${attOkId}`, null, adminTok);
check("remover anexo 200", dAtt.status === 200, JSON.stringify(dAtt.data));
const after = (await req("GET", `/posts/${pbId}`, null, adminTok)).data.attachments.length;
check("anexo some do payload", after === before - 1, `before=${before} after=${after}`);

console.log("9) Anexo em rascunho (invisível ao colaborador)");
const upD = await upload(`/posts/${pdId}/attachments`, "rascunho.pdf", "application/pdf", PDF_BYTES, adminTok);
check("upload em rascunho 201", upD.status === 201);
const dlD = await download(`/posts/${pdId}/attachments/${upD.data.id}`, collabTok);
check("rascunho → 404 para colaborador", dlD.status === 404);

console.log("10) Excluir post remove binário do disco");
const binPath = `/home/oberdan/projetos/backend/uploads/${attTId}`;
const existedBefore = await stat(binPath)
  .then(() => true)
  .catch(() => false);
check("arquivo existia antes", existedBefore);
const delPt = await req("DELETE", `/posts/${ptId}`, null, adminTok);
check("excluir post 200/204", delPt.status === 200 || delPt.status === 204);
const existsAfter = await stat(binPath)
  .then(() => true)
  .catch(() => false);
check("arquivo removido ao excluir post", existedBefore && !existsAfter);

console.log("11) Colaborador não pode anexar");
const upNoAuth = await upload(`/posts/${pbId}/attachments`, "x.pdf", "application/pdf", PDF_BYTES, collabTok);
check("colaborador → 403", upNoAuth.status === 403, JSON.stringify(upNoAuth.data));

server.close();
await mongoose.disconnect();
console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${pass} ok, ${fail} falhas`);
process.exit(fail === 0 ? 0 : 1);
