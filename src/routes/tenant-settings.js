import { Router } from "express";
import net from "node:net";
import Tenant from "../models/Tenant.js";
import auth from "../middleware/auth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { encryptSecret, decryptSecret } from "../crypto.js";
import { normalizeEmailProvider, toPublicProvider } from "../utils/emailProvider.js";

const router = Router();

// Todas as operações exigem admin do tenant (role admin + pertencimento validado no auth).
router.use(auth, requireAdmin);

async function getTenantDoc(req) {
  const tenant = await Tenant.findById(req.tenantId);
  return tenant;
}

// GET /api/tenant/settings/email-provider
router.get("/settings/email-provider", async (req, res) => {
  try {
    const tenant = await getTenantDoc(req);
    if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });
    const provider = tenant.settings?.emailProvider || null;
    if (!provider) return res.json({ provider: null });
    const plain = decryptSecret(provider.secretEncrypted);
    return res.json({ provider: toPublicProvider(provider, plain) });
  } catch (err) {
    console.error("Erro ao consultar provedor de e-mail:", err.message);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// PUT /api/tenant/settings/email-provider
router.put("/settings/email-provider", async (req, res) => {
  try {
    const tenant = await getTenantDoc(req);
    if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });

    const { value, error } = normalizeEmailProvider(req.body ?? {});
    if (error) return res.status(400).json({ error });

    const secret = typeof req.body.secret === "string" ? req.body.secret.trim() : "";
    let secretEncrypted;
    if (secret) {
      secretEncrypted = encryptSecret(secret);
    } else {
      // Retém a credencial existente (padrão write-only do frontend): se a config atual
      // não tem segredo salvo e nenhum novo veio, retorna 400.
      const existing = tenant.settings?.emailProvider;
      if (existing?.secretEncrypted) {
        secretEncrypted = existing.secretEncrypted;
      } else {
        return res.status(400).json({ error: "secret é obrigatório ao salvar" });
      }
    }

    const provider = {
      ...value,
      secretEncrypted,
      updatedBy: req.user.id,
      updatedAt: new Date().toISOString(),
    };
    tenant.set("settings.emailProvider", provider);
    await tenant.save();

    return res.json({ provider: toPublicProvider(provider, decryptSecret(secretEncrypted)) });
  } catch (err) {
    console.error("Erro ao salvar provedor de e-mail:", err.message);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// POST /api/tenant/settings/email-provider/test
router.post("/settings/email-provider/test", async (req, res) => {
  try {
    const { value, error } = normalizeEmailProvider(req.body ?? {});
    if (error) return res.status(400).json({ error });

    if (value.type === "api") {
      // Validação estrutural: envio real fica na I-08.
      return res.json({ ok: true, detail: "Configuração de API válida (envio real na I-08)" });
    }

    // SMTP: tentativa de handshake TCP (porta/host) sem envio de mensagem real.
    const ok = await smtpHandshake(value.host, value.port);
    if (!ok) {
      return res.status(400).json({ ok: false, error: "Falha na conexão SMTP" });
    }
    return res.json({ ok: true, detail: "Conexão SMTP bem-sucedida" });
  } catch (err) {
    console.error("Erro ao testar provedor de e-mail:", err.message);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

function smtpHandshake(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 5000 });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.on("connect", () => finish(true));
    socket.on("error", () => finish(false));
    socket.on("timeout", () => finish(false));
  });
}

export default router;
