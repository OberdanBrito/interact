import { Router } from "express";
import auth from "../middleware/auth.js";
import Category from "../models/Category.js";
import { tenantScopeCondition } from "../utils/tenant.js";

const router = Router();

// GET /api/categories — categorias do tenant resolvido (MT-23: coleção tenant-scoped).
// `id` é o slug (valor usado em Comunicado.categoryId); "todas" é pseudo-filtro client-side.
router.get("/", auth, async (req, res) => {
  try {
    const categories = await Category.find(
      tenantScopeCondition(req.tenantId)
    )
      .sort({ slug: 1 })
      .lean();
    res.json(
      categories.map((c) => ({ id: c.slug, label: c.label }))
    );
  } catch (err) {
    console.error("Erro ao listar categorias:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
