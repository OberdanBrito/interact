import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Tenant from "../src/models/Tenant.js";
import User from "../src/models/User.js";
import app from "../src/app.js";
import { encryptSecret, decryptSecret } from "../src/crypto.js";

// Teste de integração (Mongo real) da MT-27 — config do provedor de e-mail por tenant.
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const tenantA = await Tenant.create({ slug: "tenanta", name: "Tenant A", active: true });
const tenantB = await Tenant.create({ slug: "tenantb", name: "Tenant B", active: true });
const idA = String(tenantA._id);
const idB = String(tenantB._id);

const adminA = await User.create({
  email: "admina.mt27@x.com",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin A",
  role: "admin",
  tenantId: tenantA._id,
});
const adminB = await User.create({
  email: "adminb.mt27@x.com",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin B",
  role: "admin",
  tenantId: tenantB._id,
});
const userA = await User.create({
  email: "usera.mt27@x.com",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "User A",
  role: "user",
  tenantId: tenantA._id,
});

const server = app.listen(4027);
const base = "http://localhost:4027/api";

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

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ok: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name} ${extra}`);
  }
}

const loginA = await req("POST", "/auth/login", { email: adminA.email, password: "senha123" }, null, "tenanta");
const loginB = await req("POST", "/auth/login", { email: adminB.email, password: "senha123" }, null, "tenantb");
const loginU = await req("POST", "/auth/login", { email: userA.email, password: "senha123" }, null, "tenanta");
check("login A 200", loginA.status === 200);
check("login B 200", loginB.status === 200);
check("login user 200", loginU.status === 200);
const tokA = loginA.data.token;
const tokB = loginB.data.token;
const tokU = loginU.data.token;
const EP = "/tenant/settings/email-provider";

// ============ (a) GET vazio (sem config) ============
console.log("\n=== (a) GET sem config ===");
const getEmpty = await req("GET", EP, null, tokA, "tenanta");
check("GET sem config -> 200", getEmpty.status === 200);
check("GET sem config -> provider null", getEmpty.data.provider === null);

// ============ (b) PUT grava, GET máscara + auditoria ============
console.log("\n=== (b) PUT grava + GET máscara ===");
const payload = {
  type: "smtp",
  host: "smtp.exemplo.com",
  port: 587,
  secure: false,
  authUser: "no-reply@exemplo.com",
  secret: "senhaSuperSecreta1234",
  fromAddress: "no-reply@exemplo.com",
  fromName: "Interact",
};
const putOk = await req("PUT", EP, payload, tokA, "tenanta");
check("PUT -> 200", putOk.status === 200);
check("PUT secreto mascarado (não texto claro)", !JSON.stringify(putOk.data.provider).includes("senhaSuperSecreta1234"));
check("PUT maskedSecret com ••••1234", putOk.data.provider.maskedSecret === "••••1234");
check("PUT NÃO expõe campo secretEncrypted", !("secretEncrypted" in putOk.data.provider));
check("PUT updatedBy gravado", !!putOk.data.provider.updatedBy);
check("PUT updatedAt gravado", !!putOk.data.provider.updatedAt);
check("PUT configured true", putOk.data.provider.configured === true);

const getAfter = await req("GET", EP, null, tokA, "tenanta");
check("GET pós-PUT -> 200", getAfter.status === 200);
check("GET mascarado", getAfter.data.provider.maskedSecret === "••••1234");
check("GET NÃO expõe texto claro", !JSON.stringify(getAfter.data.provider).includes("senhaSuperSecreta1234"));

// ============ (c) segredo cifrado em repouso ============
console.log("\n=== (c) cifragem em repouso ===");
const tA = await Tenant.findById(tenantA._id).lean();
const stored = tA.settings.emailProvider.secretEncrypted;
check("secretEncrypted é ciphertext iv:tag:data", typeof stored === "string" && stored.split(":").length === 3);
check("segredo no banco NÃO é texto claro", !stored.includes("senhaSuperSecreta1234"));
const decrypted = decryptSecret(stored);
check("ciphertext decifra de volta", decrypted === "senhaSuperSecreta1234");

// ============ (d) não-admin -> 403 ============
console.log("\n=== (d) RBAC não-admin ===");
const getUser = await req("GET", EP, null, tokU, "tenanta");
check("GET por user -> 403", getUser.status === 403);
const putUser = await req("PUT", EP, payload, tokU, "tenanta");
check("PUT por user -> 403", putUser.status === 403);

// ============ (e) POST /test sucesso e falha, sem persistir ============
console.log("\n=== (e) POST /test ===");
const testApiOk = await req("POST", `${EP}/test`, { ...payload, type: "api" }, tokA, "tenanta");
check("test api -> 200 ok:true", testApiOk.status === 200 && testApiOk.data.ok === true);
const testSmtpFail = await req("POST", `${EP}/test`, { ...payload, host: "127.0.0.1", port: 1 }, tokA, "tenanta");
check("test smtp falha -> 400 ok:false", testSmtpFail.status === 400 && testSmtpFail.data.ok === false);
const tAAfterTest = await Tenant.findById(tenantA._id).lean();
check("test NÃO alterou host", tAAfterTest.settings.emailProvider.host === "smtp.exemplo.com");
check("test NÃO alterou secret", tAAfterTest.settings.emailProvider.secretEncrypted === stored);

// ============ (f) PUT retém credencial quando secret vazio (write-only) ============
console.log("\n=== (f) PUT sem secret retém credencial ===");
const putRetain = await req("PUT", EP, { ...payload, secret: "" }, tokA, "tenanta");
check("PUT sem secret -> 200", putRetain.status === 200);
check("PUT sem secret mantém secretEncrypted", putRetain.data.provider.configured === true && putRetain.data.provider.maskedSecret === "••••1234");
const tARetain = await Tenant.findById(tenantA._id).lean();
check("secretEncrypted inalterado após retenção", tARetain.settings.emailProvider.secretEncrypted === stored);

// ============ (g) escopo por tenant: B não vê/alteria config de A ============
console.log("\n=== (g) escopo por tenant ===");
const getByB = await req("GET", EP, null, tokB, "tenantb");
check("GET de B -> provider null (B não tem config e não vê a de A)", getByB.status === 200 && getByB.data.provider === null);
const putByB = await req("PUT", EP, { ...payload, host: "smtp.b.com" }, tokB, "tenantb");
check("PUT de B grava host smtp.b.com", putByB.status === 200 && putByB.data.provider.host === "smtp.b.com");
const tAGetByBinDB = await Tenant.findById(tenantA._id).lean();
check("config de A inalterada após PUT de B", tAGetByBinDB.settings.emailProvider.host === "smtp.exemplo.com");

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
process.exit(fail ? 1 : 0);
