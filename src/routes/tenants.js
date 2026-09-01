import { Router } from "express";
import Tenant from "../models/Tenant.js";
import auth from "../middleware/auth.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

function toTenant(t) {
  return t
    ? {
        id: t._id ? String(t._id) : null,
        slug: t.slug,
        name: t.name,
        subdomain: t.subdomain ?? null,
        domain: t.domain ?? null,
        plan: t.plan ?? "free",
        active: t.active ?? true,
      }
    : null;
}

router.get("/", auth, requireAdmin, async (req, res) => {
  try {
    const tenants = await Tenant.find().lean();
    res.json(tenants.map(toTenant));
  } catch (err) {
    console.error("Erro ao listar tenants:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

router.get("/resolve", async (req, res) => {
  res.json({ tenant: toTenant(req.tenant), tenantId: req.tenantId ?? null });
});

export default router;
