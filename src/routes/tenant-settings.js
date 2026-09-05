import { Router } from "express";
import net from "node:net";
import Tenant from "../models/Tenant.js";
import auth from "../middleware/auth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { encryptSecret, decryptSecret } from "../crypto.js";
import { normalizeEmailProvider, toPublicProvider, resolveProviderConfig } from "../utils/emailProvider.js";
import { sendWithProvider } from "../utils/emailSender.js";

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

    const saved = tenant.settings?.emailProvider || null;
    const { value, plainSecret, error } = resolveProviderConfig(req.body ?? {}, saved);
    if (error) return res.status(400).json({ error });

    const secret = typeof req.body.secret === "string" ? req.body.secret.trim() : "";
    let secretEncrypted;
    if (secret) {
      secretEncrypted = encryptSecret(secret);
    } else {
      // Retém a credencial existente (padrão write-only do frontend): se a config atual
      // não tem segredo salvo e nenhum novo veio, retorna 400.
      if (saved?.secretEncrypted) {
        secretEncrypted = saved.secretEncrypted;
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

    return res.json({ provider: toPublicProvider(provider, plainSecret) });
  } catch (err) {
    console.error("Erro ao salvar provedor de e-mail:", err.message);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// POST /api/tenant/settings/email-provider/test
router.post("/settings/email-provider/test", async (req, res) => {
  try {
    const mode = req.body?.mode === "send" ? "send" : "connect";

    if (mode === "send") {
      return await handleSendTest(req, res);
    }

    const { value, error } = normalizeEmailProvider(req.body ?? {});
    if (error) return res.status(400).json({ error });

    if (value.type === "api") {
      // Validação estrutural: envio real fica na I-17 (type api ainda não suportado).
      return res.json({ ok: true, detail: "Configuração de API válida (envio real disponível apenas para SMTP)" });
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

// Modo send do teste: envia um e-mail de teste real pelo adaptador, sem persistir config.
async function handleSendTest(req, res) {
  const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
  if (!to) {
    return res.status(400).json({ error: "to é obrigatório para o teste de envio" });
  }

  const tenant = await getTenantDoc(req);
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });
  const saved = tenant.settings?.emailProvider || null;

  const { value, plainSecret, error } = resolveProviderConfig(req.body ?? {}, saved);
  if (error) return res.status(400).json({ error });
  if (!plainSecret) {
    return res.status(400).json({ error: "secret é obrigatório para o teste de envio" });
  }

  try {
    const result = await sendWithProvider(value, plainSecret, {
      to,
      subject: "[Interact] E-mail de teste",
      html: "<p>Este é um e-mail de teste do Interact. Se você o recebeu, a configuração do provedor está funcionando.</p>",
    });
    return res.json({ ok: true, detail: "E-mail de teste enviado", result });
  } catch (err) {
    console.error("Erro no teste de envio:", err.message);
    return res.status(400).json({ ok: false, error: err.message });
  }
}

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
