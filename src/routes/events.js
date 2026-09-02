import { Router } from "express";
import jwt from "jsonwebtoken";
import auth from "../middleware/auth.js";
import { emitter, EMIT_STREAM } from "../events.js";

const router = Router();

const HEARTBEAT_MS = Number.parseInt(process.env.SSE_HEARTBEAT_MS, 10) || 30000;

// GET /api/events — stream SSE autenticado.
// EventSource (browser) não envia o header Authorization; aceitamos o JWT também
// via ?token=, hoistando para o header antes do middleware de auth existente
// (mesma verificação: JWT_SECRET + busca do usuário). Token nunca é logado.
router.get("/", (req, res) => {
  const token = req.query.token;
  if (!req.headers.authorization && token) {
    req.headers.authorization = `Bearer ${token}`;
  }
  // Resolve o tenant da conexão a partir da claim do token (verificada), ANTES do
  // auth: o middleware global de tenant roda sem req.user e cairia no fallback de
  // dev, fazendo o auth rejeitar (403) usuários de tenants não-default no canal.
  try {
    const claim = jwt.verify(req.headers.authorization.slice(7), process.env.JWT_SECRET);
    if (claim.tenantId) req.tenantId = String(claim.tenantId);
  } catch {
    /* token ausente/inválido — o auth retornará 401 */
  }
  auth(req, res, () => {
    openStream(req, res);
  });
});

function openStream(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(":connected\n\n");

  // Tenant da conexão = tenant do usuário autenticado (claim do JWT, setada pelo `auth`).
  // Fonte confiável por conexão: o cliente só vê eventos do SEU tenant; payloads com
  // tenantId divergente (ou sem tenantId) são descartados — isolamento de tenant no
  // canal compartilhado (MT-24). Usa req.user em vez de req.tenantId porque o middleware
  // de resolução roda antes do auth (sem req.user) e cairia no fallback de dev.
  const connTenantId = req.user?.tenantId ? String(req.user.tenantId) : null;

  // Repassa qualquer evento emitido via `emitSafe` mantendo o nome original,
  // no formato SSE nomeado: `event: <name>` + `data: <json>`.
  const onStream = (eventName, payload) => {
    const payloadTenantId = payload?.tenantId ? String(payload.tenantId) : null;
    if (connTenantId == null || payloadTenantId !== connTenantId) return;
    try {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      /* cliente já desconectou — ignora */
    }
  };
  emitter.on(EMIT_STREAM, onStream);

  // Heartbeat para o cliente detectar conexão morta e reconectar.
  const heartbeat = setInterval(() => {
    try {
      res.write(":keepalive\n\n");
    } catch {
      /* cliente já desconectou — ignora */
    }
  }, HEARTBEAT_MS);

  // Limpeza: remove o listener e o heartbeat para não vazar por cliente.
  req.on("close", () => {
    clearInterval(heartbeat);
    emitter.off(EMIT_STREAM, onStream);
    res.end();
  });
}

export default router;
