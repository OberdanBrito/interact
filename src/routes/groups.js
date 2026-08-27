import { Router } from "express";
import Group from "../models/Group.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

// Todas as rotas deste arquivo requerem autenticação
router.use(auth);
// TODAS as rotas de grupos são admin-only
router.use(requireAdmin);

// GET /api/groups — lista todos (ordenado por name asc)
router.get("/", async (req, res) => {
  try {
    const groups = await Group.find().sort({ name: 1 }).lean();
    res.json(
      groups.map((g) => ({ id: g._id.toString(), name: g.name, active: g.active }))
    );
  } catch (err) {
    console.error("Erro ao listar grupos:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// POST /api/groups — cria grupo (400 se nome vazio ou duplicado)
router.post("/", async (req, res) => {
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Nome do grupo é obrigatório" });
  }

  try {
    const trimmed = String(name).trim();
    const exists = await Group.findOne({ name: trimmed });
    if (exists) {
      return res.status(400).json({ error: "Já existe um grupo com esse nome" });
    }

    const group = await Group.create({ name: trimmed });
    res.status(201).json({
      id: group._id.toString(),
      name: group.name,
      active: group.active,
    });
  } catch (err) {
    console.error("Erro ao criar grupo:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// PUT /api/groups/:id — edita nome/ativo (renomear é seguro: referências são por _id)
router.put("/:id", async (req, res) => {
  const { name, active } = req.body;

  try {
    const update = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ error: "Nome do grupo é obrigatório" });
      }
      const dup = await Group.findOne({ name: trimmed, _id: { $ne: req.params.id } });
      if (dup) {
        return res.status(400).json({ error: "Já existe um grupo com esse nome" });
      }
      update.name = trimmed;
    }

    if (active !== undefined) update.active = Boolean(active);

    const group = await Group.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    res.json({ id: group._id.toString(), name: group.name, active: group.active });
  } catch (err) {
    console.error("Erro ao editar grupo:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// DELETE /api/groups/:id — 405 (sem hard delete; usar PUT com active:false)
router.delete("/:id", (req, res) => {
  res
    .status(405)
    .json({ error: "Grupos não podem ser excluídos. Use a desativação (active: false)." });
});

// POST /api/groups/recipient-count — { targetGroups: [] } → { count }
router.post("/recipient-count", async (req, res) => {
  const { targetGroups } = req.body;

  if (!Array.isArray(targetGroups)) {
    return res.status(400).json({ error: "targetGroups deve ser um array" });
  }

  try {
    let count;
    if (targetGroups.length === 0) {
      // broadcast: só colaboradores (não admins)
      count = await User.countDocuments({ role: "colaborador" });
    } else {
      // união distinta
      count = await User.countDocuments({ groupIds: { $in: targetGroups } });
    }
    res.json({ count });
  } catch (err) {
    console.error("Erro ao contar destinatários:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
