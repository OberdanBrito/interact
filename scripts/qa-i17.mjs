import "dotenv/config";
import net from "node:net";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Tenant from "../src/models/Tenant.js";
import User from "../src/models/User.js";
import app from "../src/app.js";
import { encryptSecret, decryptSecret } from "../src/crypto.js";
import { sendEmail } from "../src/utils/emailSender.js";

// Teste de integração (Mongo real) da I-17 — adaptador de envio de e-mail por tenant (SMTP).
process.env.MONGODB_URI =
  "mongodb://interact:interact@localhost:27017/interact_test?authSource=admin";
await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();

const tenantA = await Tenant.create({ slug: "tenanta", name: "Tenant A", active: true });
const tenantNoProvider = await Tenant.create({ slug: "tenantsem", name: "Tenant Sem", active: true });
const idA = String(tenantA._id);

const adminA = await User.create({
  email: "admina.i17@x.com",
  password_hash: bcrypt.hashSync("senha123", 10),
  name: "Admin A",
  role: "admin",
  tenantId: tenantA._id,
});

const server = app.listen(4017);
const base = "http://localhost:4017/api";

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
check("login A 200", loginA.status === 200);
const tokA = loginA.data.token;
const EP = "/tenant/settings/email-provider";

// Servidor SMTP fake que aceita o envio (250 em todos os comandos pós-EHLO).
const fakeServer = net.createServer((socket) => {
  socket.write("220 fake.local ESMTP\r\n");
  let buf = "";
  socket.on("data", (chunk) => {
    buf += chunk.toString();
    if (buf.includes("EHLO")) { socket.write("250-fake.local\r\n250 AUTH LOGIN PLAIN\r\n"); buf = ""; }
    else if (buf.includes("AUTH")) { socket.write("235 2.7.0 Authentication successful\r\n"); buf = ""; }
    else if (buf.includes("QUIT")) { socket.write("221 bye\r\n"); socket.end(); }
    else if (buf.includes("MAIL FROM") || buf.includes("RCPT TO") || buf.includes("DATA") || buf.includes(".")) { socket.write("250 OK\r\n"); buf = ""; }
  });
});
await new Promise((res) => fakeServer.listen(0, "127.0.0.1", res));
const fakePort = fakeServer.address().port;

const smtpPayload = {
  type: "smtp",
  host: "127.0.0.1",
  port: fakePort,
  secure: false,
  authUser: "no-reply@exemplo.com",
  secret: "senhaI17Secreta",
  fromAddress: "no-reply@exemplo.com",
  fromName: "Interact",
};

// ============ (a) dry-run do adaptador (sem provider) ============
console.log("\n=== (a) dry-run sem provider (dev) ===");
const dry = await sendEmail({ to: "x@y.com", subject: "Teste", html: "<p>oi</p>", tenantId: String(tenantNoProvider._id) });
check("dry-run retorna sucesso", dry.dryRun === true && dry.to === "x@y.com");

const savedProd = process.env.NODE_ENV;
process.env.NODE_ENV = "production";
try {
  await sendEmail({ to: "x@y.com", subject: "Teste", html: "<p>oi</p>", tenantId: String(tenantNoProvider._id) });
  check("prod sem provider -> erro", false);
} catch (err) {
  check("prod sem provider -> erro claro", /não configurado/.test(err.message));
}
process.env.NODE_ENV = savedProd;

// ============ (b) type api no envio -> erro claro ============
console.log("\n=== (b) type api no envio ===");
const apiTenant = await Tenant.create({ slug: "tenantapi", name: "Tenant API", active: true });
apiTenant.settings = { emailProvider: { type: "api", host: "api.x.com", port: 443, secure: true, authUser: "u", secretEncrypted: encryptSecret("apikey123"), fromAddress: "a@b.c", fromName: "N" } };
await apiTenant.save();
try {
  await sendEmail({ to: "x@y.com", subject: "t", html: "<p>x</p>", tenantId: String(apiTenant._id) });
  check("api -> erro", false);
} catch (err) {
  check("api -> erro claro (ainda não suportado)", /api ainda não/.test(err.message));
}

// ============ (c) envio real via SMTP fake (adaptador) ============
console.log("\n=== (c) envio real via SMTP fake ===");
const okTenant = await Tenant.create({ slug: "tenantok", name: "Tenant OK", active: true });
okTenant.settings = { emailProvider: { type: "smtp", host: "127.0.0.1", port: fakePort, secure: false, authUser: "u", secretEncrypted: encryptSecret("segredoI17"), fromAddress: "a@b.c", fromName: "N" } };
await okTenant.save();
const sent = await sendEmail({ to: "dest@x.com", subject: "Teste", html: "<p>x</p>", tenantId: String(okTenant._id) });
check("envio real -> sent:true", sent.sent === true && sent.to === "dest@x.com");

// ============ (d) teste send sem to -> 400 ============
console.log("\n=== (d) POST /test mode send sem to ===");
const noTo = await req("POST", `${EP}/test`, { ...smtpPayload, mode: "send" }, tokA, "tenanta");
check("send sem to -> 400", noTo.status === 400 && /to é obrigatório/.test(noTo.data.error));

// ============ (e) teste send com sucesso (SMTP fake) ============
console.log("\n=== (e) POST /test mode send sucesso ===");
const sendOk = await req("POST", `${EP}/test`, { ...smtpPayload, mode: "send", to: "teste@exemplo.com" }, tokA, "tenanta");
check("send ok -> 200 ok:true", sendOk.status === 200 && sendOk.data.ok === true);
check("send ok -> detail", /E-mail de teste enviado/.test(sendOk.data.detail));

// ============ (f) teste NÃO persiste config ============
console.log("\n=== (f) teste não persiste ===");
const tA = await Tenant.findById(tenantA._id).lean();
check("config de A segue sem provider", !tA.settings?.emailProvider);

// ============ (g) modo connect default (retrocompatível) ============
console.log("\n=== (g) POST /test mode connect (default) ===");
const connectFail = await req("POST", `${EP}/test`, { ...smtpPayload, host: "127.0.0.1", port: 1 }, tokA, "tenanta");
check("connect com porta fechada -> 400", connectFail.status === 400 && connectFail.data.ok === false);
const connectApi = await req("POST", `${EP}/test`, { ...smtpPayload, type: "api" }, tokA, "tenanta");
check("connect api -> 200 ok:true", connectApi.status === 200 && connectApi.data.ok === true);

// ============ (h) segredo nunca vaza em erro de envio ============
console.log("\n=== (h) segredo não vaza em falha ===");
const badSecret = "SEGREDO-I17-NAO-PODE-VAZAR";
const badTenant = await Tenant.create({ slug: "tenantbad", name: "Tenant Bad", active: true });
badTenant.settings = { emailProvider: { type: "smtp", host: "127.0.0.1", port: 1, secure: false, authUser: "u", secretEncrypted: encryptSecret(badSecret), fromAddress: "a@b.c", fromName: "N" } };
await badTenant.save();
try {
  await sendEmail({ to: "x@y.com", subject: "t", html: "<p>x</p>", tenantId: String(badTenant._id) });
  check("envio para porta 1 -> erro", false);
} catch (err) {
  check("erro de envio não vaza segredo", !err.message.includes(badSecret));
}

console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
server.close();
fakeServer.close();
process.exit(fail ? 1 : 0);