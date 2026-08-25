import { Router } from "express";
import pool from "../db/pool.js";
import auth from "../middleware/auth.js";

const router = Router();

// Todas as rotas deste arquivo requerem autenticação
router.use(auth);

// GET /api/posts — lista todos. Query params: ?category, ?search
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;

    let sql = `
      SELECT id, read_mode AS "readMode", category_id AS "categoryId",
             urgent, like_base AS "likeBase", title, body,
             author_name AS "authorName", author_role AS "authorRole",
             date_iso AS "dateISO", created_at, updated_at
      FROM comunicados
    `;
    const conditions = [];
    const params = [];

    if (category && category !== "todas") {
      params.push(category);
      conditions.push(`category_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(title ILIKE $${params.length} OR author_name ILIKE $${params.length})`
      );
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY date_iso DESC";

    const { rows } = await pool.query(sql, params);

    // Adapta formato para espelhar o schema do frontend
    const posts = rows.map((r) => ({
      id: r.id,
      readMode: r.readMode,
      categoryId: r.categoryId,
      urgent: r.urgent,
      likeBase: r.likeBase,
      title: r.title,
      body: r.body,
      author: { name: r.authorName, role: r.authorRole },
      dateISO: r.dateISO,
    }));

    res.json(posts);
  } catch (err) {
    console.error("Erro ao listar comunicados:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// GET /api/posts/:id — detalhe de um comunicado
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, read_mode AS "readMode", category_id AS "categoryId",
              urgent, like_base AS "likeBase", title, body,
              author_name AS "authorName", author_role AS "authorRole",
              date_iso AS "dateISO", created_at, updated_at
       FROM comunicados WHERE id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    const r = rows[0];
    res.json({
      id: r.id,
      readMode: r.readMode,
      categoryId: r.categoryId,
      urgent: r.urgent,
      likeBase: r.likeBase,
      title: r.title,
      body: r.body,
      author: { name: r.authorName, role: r.authorRole },
      dateISO: r.dateISO,
    });
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
    const { rows: last } = await pool.query(
      "SELECT id FROM comunicados ORDER BY id DESC LIMIT 1"
    );
    let nextNum = 1;
    if (last.length > 0) {
      const match = last[0].id.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const newId = `p${String(nextNum).padStart(2, "0")}`;

    const { rows } = await pool.query(
      `INSERT INTO comunicados
         (id, read_mode, category_id, urgent, like_base, title, body,
          author_name, author_role, date_iso)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       RETURNING id, read_mode AS "readMode", category_id AS "categoryId",
                 urgent, like_base AS "likeBase", title, body,
                 author_name AS "authorName", author_role AS "authorRole",
                 date_iso AS "dateISO", created_at, updated_at`,
      [
        newId,
        readMode || "auto",
        categoryId,
        urgent || false,
        0,
        title,
        body || [],
        author?.name || null,
        author?.role || null,
      ]
    );

    const r = rows[0];
    res.status(201).json({
      id: r.id,
      readMode: r.readMode,
      categoryId: r.categoryId,
      urgent: r.urgent,
      likeBase: r.likeBase,
      title: r.title,
      body: r.body,
      author: { name: r.authorName, role: r.authorRole },
      dateISO: r.dateISO,
    });
  } catch (err) {
    console.error("Erro ao criar comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// PUT /api/posts/:id — edita comunicado (body parcial)
router.put("/:id", async (req, res) => {
  const { readMode, categoryId, urgent, title, body, author } = req.body;

  try {
    // Verifica existência
    const { rows: existing } = await pool.query(
      "SELECT id FROM comunicados WHERE id = $1",
      [req.params.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    const { rows } = await pool.query(
      `UPDATE comunicados SET
         read_mode    = COALESCE($1, read_mode),
         category_id  = COALESCE($2, category_id),
         urgent       = COALESCE($3, urgent),
         title        = COALESCE($4, title),
         body         = COALESCE($5, body),
         author_name  = COALESCE($6, author_name),
         author_role  = COALESCE($7, author_role),
         updated_at   = NOW()
       WHERE id = $8
       RETURNING id, read_mode AS "readMode", category_id AS "categoryId",
                 urgent, like_base AS "likeBase", title, body,
                 author_name AS "authorName", author_role AS "authorRole",
                 date_iso AS "dateISO", created_at, updated_at`,
      [
        readMode || null,
        categoryId || null,
        urgent ?? null,
        title || null,
        body || null,
        author?.name || null,
        author?.role || null,
        req.params.id,
      ]
    );

    const r = rows[0];
    res.json({
      id: r.id,
      readMode: r.readMode,
      categoryId: r.categoryId,
      urgent: r.urgent,
      likeBase: r.likeBase,
      title: r.title,
      body: r.body,
      author: { name: r.authorName, role: r.authorRole },
      dateISO: r.dateISO,
    });
  } catch (err) {
    console.error("Erro ao editar comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// DELETE /api/posts/:id — exclui comunicado
router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM comunicados WHERE id = $1",
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    res.status(204).end();
  } catch (err) {
    console.error("Erro ao excluir comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
