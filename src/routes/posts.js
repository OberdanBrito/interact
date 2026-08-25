import { Router } from "express";
import Comunicado from "../models/Comunicado.js";
import auth from "../middleware/auth.js";

const router = Router();

// Todas as rotas deste arquivo requerem autenticação
router.use(auth);

// Adapta formato para espelhar o schema do frontend
function toPost(doc) {
  return {
    id: doc._id,
    readMode: doc.readMode,
    categoryId: doc.categoryId,
    urgent: doc.urgent,
    likeBase: doc.likeBase,
    title: doc.title,
    body: doc.body,
    author: {
      name: doc.author?.name ?? null,
      role: doc.author?.role ?? null,
    },
    dateISO: doc.dateISO ? new Date(doc.dateISO).toISOString() : null,
  };
}

// Escapa metacaracteres para busca literal (equivalente ao ILIKE %...%)
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/posts — lista todos. Query params: ?category, ?search
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;

    const filter = {};

    if (category && category !== "todas") {
      filter.categoryId = category;
    }

    if (search) {
      const rx = new RegExp(escapeRegExp(search), "i");
      filter.$or = [{ title: rx }, { "author.name": rx }];
    }

    const docs = await Comunicado.find(filter).sort({ dateISO: -1 }).lean();

    res.json(docs.map(toPost));
  } catch (err) {
    console.error("Erro ao listar comunicados:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// GET /api/posts/:id — detalhe de um comunicado
router.get("/:id", async (req, res) => {
  try {
    const doc = await Comunicado.findById(req.params.id).lean();

    if (!doc) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    res.json(toPost(doc));
  } catch (err) {
    console.error("Erro ao buscar comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// POST /api/posts — cria comunicado
router.post("/", async (req, res) => {
  const { readMode, categoryId, urgent, title, body, author } = req.body;

  if (!title || !categoryId) {
    return res
      .status(400)
      .json({ error: "Título e categoria são obrigatórios" });
  }

  try {
    // Gera próximo ID (p01, p02, ...)
    const last = await Comunicado.findOne().sort({ _id: -1 }).select("_id").lean();
    let nextNum = 1;
    if (last) {
      const match = last._id.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const newId = `p${String(nextNum).padStart(2, "0")}`;

    const doc = await Comunicado.create({
      _id: newId,
      readMode: readMode || "auto",
      categoryId,
      urgent: urgent || false,
      likeBase: 0,
      title,
      body: body || [],
      author: {
        name: author?.name || null,
        role: author?.role || null,
      },
      dateISO: new Date(),
    });

    res.status(201).json(toPost(doc));
  } catch (err) {
    console.error("Erro ao criar comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// PUT /api/posts/:id — edita comunicado (body parcial)
router.put("/:id", async (req, res) => {
  const { readMode, categoryId, urgent, title, body, author } = req.body;

  try {
    const doc = await Comunicado.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    // Update parcial — só altera campos presentes (equivalente ao COALESCE)
    if (readMode) doc.readMode = readMode;
    if (categoryId) doc.categoryId = categoryId;
    if (urgent !== undefined && urgent !== null) doc.urgent = urgent;
    if (title) doc.title = title;
    if (body) doc.body = body;
    if (author?.name) doc.author.name = author.name;
    if (author?.role) doc.author.role = author.role;

    await doc.save();

    res.json(toPost(doc));
  } catch (err) {
    console.error("Erro ao editar comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// DELETE /api/posts/:id — exclui comunicado
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Comunicado.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    res.status(204).end();
  } catch (err) {
    console.error("Erro ao excluir comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
