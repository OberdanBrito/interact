import mongoose from "mongoose";
import { Router } from "express";
import { unlink } from "node:fs/promises";
import path from "node:path";
import Comunicado from "../models/Comunicado.js";
import Group from "../models/Group.js";
import auth from "../middleware/auth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { schedulePublish, cancelPublish } from "../scheduler.js";
import { emitSafe, EVENTS } from "../events.js";
import upload, { UPLOAD_DIR, MAX_ATTACHMENT_MB } from "../upload.js";

const router = Router();

// Todas as rotas deste arquivo requerem autenticação
router.use(auth);

// Adapta formato para espelhar o schema do frontend
export async function toPost(doc) {
  const targetGroups = doc.targetGroups ?? [];
  // Rascunho nunca é publicado (invariante D1)
  const published = doc.draft === true ? false : doc.published !== false;

  // Resolve nomes dos grupos-alvo na mesma ordem de targetGroups
  // (inclui grupos inativos — comunicados antigos continuam mostrando nomes)
  let targetGroupNames = [];
  if (targetGroups.length > 0) {
    const groups = await Group.find({ _id: { $in: targetGroups } })
      .select("name")
      .lean();
    const nameById = new Map(groups.map((g) => [String(g._id), g.name]));
    targetGroupNames = targetGroups.map((id) => nameById.get(String(id)) ?? null);
  }

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
    targetGroups,
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    targetGroupNames,
    published,
    status: doc.draft === true ? "rascunho" : published ? "publicado" : "agendado",
    publishAt: doc.publishAt ? new Date(doc.publishAt).toISOString() : null,
    pinned: doc.pinned === true,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
    expired:
      doc.expiresAt != null && new Date(doc.expiresAt).getTime() < Date.now(),
    attachments: doc.attachments ?? [],
  };
}

// Janela de idade que separa comunicados ativos de arquivados (I-12)
const ARCHIVE_AFTER_DAYS = Number.parseInt(process.env.ARCHIVE_AFTER_DAYS, 10) || 30;

// Escapa metacaracteres para busca literal (equivalente ao ILIKE %...%)
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Elegibilidade de um comunicado para um usuário (I-03):
// admin vê só o que publicou; colaborador vê somente publicados, não expirados e
// direcionados aos seus grupos (ou broadcast). Não-elegível → 404 (não revela o recurso).
function isPostEligible(doc, user) {
  const targetGroups = doc.targetGroups ?? [];
  const expired =
    doc.expiresAt != null && new Date(doc.expiresAt).getTime() < Date.now();
  if (user.role === "admin") {
    return String(doc.createdBy) === String(user.id);
  }
  return (
    doc.published !== false &&
    !expired &&
    (targetGroups.length === 0 ||
      targetGroups.some((g) => user.groupIds.includes(g)))
  );
}

function attachmentFilePath(attachmentId) {
  return path.resolve(UPLOAD_DIR, attachmentId);
}

// GET /api/posts — lista todos. Query params: ?category, ?search, ?groupId, ?archive
router.get("/", async (req, res) => {
  try {
    const { category, search, groupId, archive } = req.query;

    const filter = {};
    const and = [];

    if (category && category !== "todas") {
      filter.categoryId = category;
    }

    if (search) {
      const rx = new RegExp(escapeRegExp(search), "i");
      and.push({ $or: [{ title: rx }, { "author.name": rx }] });
    }

    // Filtro de arquivo (I-12): separa ativos de antigos por idade, só para colaborador.
    // Admin ignora o parâmetro (continua vendo só o que publicou, sem separação por idade).
    if (req.user.role !== "admin" && (archive === "active" || archive === "archived")) {
      const cutoff = new Date(
        Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000
      );
      filter.dateISO = archive === "active" ? { $gte: cutoff } : { $lt: cutoff };
    }

    // Filtro de expirados (I-05): colaborador nunca vê comunicado com validade vencida,
    // em nenhuma visão (sem ?archive, active e archived) — expiração é mais forte que idade.
    if (req.user.role !== "admin") {
      and.push({
        $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }],
      });
    }

    // Visibilidade por grupo (feature segmentação)
    if (groupId) {
      if (req.user.role !== "admin" && !req.user.groupIds.includes(groupId)) {
        return res.status(403).json({ error: "Você não pertence a este grupo" });
      }
      if (req.user.role === "admin") {
        filter.createdBy = req.user.id; // admin vê só o que publicou
      }
      and.push({
        $or: [{ targetGroups: { $size: 0 } }, { targetGroups: groupId }],
      });
    } else if (req.user.role === "admin") {
      filter.createdBy = req.user.id; // admin vê só o que publicou
    } else {
      and.push({
        $or: [
          { targetGroups: { $size: 0 } }, // broadcast
          { targetGroups: { $in: req.user.groupIds } }, // direcionado aos grupos do usuário
        ],
      });
    }

    // Agendados só aparecem para quem os agendou (admin, na listagem).
    // Colaborador nunca vê comunicado ainda não liberado.
    if (req.user.role !== "admin") {
      and.push({ published: true });
    }

    if (and.length > 0) {
      filter.$and = and;
    }

    // Fixados primeiro, depois por recência (I-04). Mongo: false < true, então -1 põe true no topo.
    const docs = await Comunicado.find(filter).sort({ pinned: -1, dateISO: -1 }).lean();

    res.json(await Promise.all(docs.map(toPost)));
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

    // Visibilidade: não elegível → 404 (não revela existência)
    if (!isPostEligible(doc, req.user)) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    res.json(await toPost(doc));
  } catch (err) {
    console.error("Erro ao buscar comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// POST /api/posts — cria comunicado (somente admin)
router.post("/", requireAdmin, async (req, res) => {
  const {
    readMode,
    categoryId,
    urgent,
    title,
    body,
    author,
    targetGroups,
    publishAt,
    status,
    expiresAt,
  } = req.body;

  // Rascunho (I-02): criado sem publicar, com validação relaxada e sem data de liberação
  const isDraft = status === "draft" || req.body.draft === true;

  if (!isDraft && (!title || !categoryId)) {
    return res
      .status(400)
      .json({ error: "Título e categoria são obrigatórios" });
  }

  // Valida targetGroups: array de strings (ids de grupo)
  let groups = [];
  if (targetGroups !== undefined) {
    if (
      !Array.isArray(targetGroups) ||
      !targetGroups.every(
        (g) => typeof g === "string" && mongoose.isValidObjectId(g)
      )
    ) {
      return res.status(400).json({ error: "Grupo-alvo inválido ou inativo" });
    }
    if (targetGroups.length > 0) {
      // Todos os grupos devem existir e estar ativos
      const found = await Group.find({
        _id: { $in: targetGroups },
        active: true,
      }).lean();
      if (found.length !== new Set(targetGroups).size) {
        return res
          .status(400)
          .json({ error: "Grupo-alvo inválido ou inativo" });
      }
    }
    groups = targetGroups;
  }

  // Valida agendamento (opcional) — só data futura. Rascunho nunca agenda.
  let scheduledAt = null;
  if (!isDraft && publishAt && publishAt !== "") {
    const candidate = new Date(publishAt);
    if (Number.isNaN(candidate.getTime())) {
      return res.status(400).json({ error: "Data de agendamento inválida" });
    }
    if (candidate.getTime() <= Date.now()) {
      return res
        .status(400)
        .json({ error: "A data de agendamento deve estar no futuro" });
    }
    scheduledAt = candidate;
  }

  // Valida validade (opcional, I-05): formato inválido → 400;
  // data passada é aceita (expiração imediata — `expired: true`).
  let expiresAtDate = null;
  if (expiresAt && expiresAt !== "") {
    const candidate = new Date(expiresAt);
    if (Number.isNaN(candidate.getTime())) {
      return res.status(400).json({ error: "Data de validade inválida" });
    }
    expiresAtDate = candidate;
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
      targetGroups: groups,
      createdBy: req.user.id, // sempre do token, nunca do body
      // Agendado: dataISO = publishAt para posicionar o post na ordem correta do feed
      dateISO: scheduledAt || new Date(),
      publishAt: isDraft ? null : scheduledAt,
      published: !isDraft && !scheduledAt,
      draft: isDraft,
      expiresAt: expiresAtDate,
    });

    if (scheduledAt) {
      schedulePublish(doc);
    }

    if (!isDraft && !scheduledAt) {
      emitSafe(EVENTS.POST_NEW, await toPost(doc));
    }

    res.status(201).json(await toPost(doc));
  } catch (err) {
    console.error("Erro ao criar comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// PUT /api/posts/:id — edita comunicado (somente admin, body parcial)
router.put("/:id", requireAdmin, async (req, res) => {
  const {
    readMode,
    categoryId,
    urgent,
    title,
    body,
    author,
    targetGroups,
    publishAt,
    status,
    pinned,
    expiresAt,
  } = req.body;

  // Transições de estado (I-02)
  const toDraft = status === "draft";
  const toPublish = status === "published";

  try {
    const doc = await Comunicado.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    // Comunicado já publicado não pode voltar a rascunho (imutabilidade pós-liberação)
    if (toDraft && doc.published === true) {
      return res
        .status(400)
        .json({ error: "Não é possível transformar um comunicado publicado em rascunho" });
    }

    // Publicar rascunho exige os campos obrigatórios (valor efetivo: payload ou já salvo)
    const effectiveTitle = title !== undefined ? title : doc.title;
    const effectiveCategory = categoryId !== undefined ? categoryId : doc.categoryId;
    const effectiveAuthorName =
      author?.name !== undefined ? author.name : doc.author?.name;
    const effectiveBody = body !== undefined ? body : doc.body;
    if (
      toPublish &&
      (!effectiveTitle ||
        !effectiveCategory ||
        !effectiveAuthorName ||
        !effectiveBody ||
        effectiveBody.length === 0)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Título, categoria, autor e conteúdo são obrigatórios para publicar",
        });
    }

    // Alvo é imutável APÓS a publicação; rascunho/agendado ainda pode editar (D4)
    if (targetGroups !== undefined) {
      if (doc.published === true) {
        return res
          .status(400)
          .json({ error: "Alvo não pode ser alterado após publicação" });
      }
      if (
        !Array.isArray(targetGroups) ||
        !targetGroups.every(
          (g) => typeof g === "string" && mongoose.isValidObjectId(g)
        )
      ) {
        return res.status(400).json({ error: "Grupo-alvo inválido ou inativo" });
      }
      if (targetGroups.length > 0) {
        const found = await Group.find({
          _id: { $in: targetGroups },
          active: true,
        }).lean();
        if (found.length !== new Set(targetGroups).size) {
          return res
            .status(400)
            .json({ error: "Grupo-alvo inválido ou inativo" });
        }
      }
      doc.targetGroups = targetGroups;
    }

    // Transição para rascunho: sem data de liberação, não publicado (invariante D1)
    if (toDraft) {
      doc.draft = true;
      doc.published = false;
      doc.publishAt = null;
      cancelPublish(doc._id);
      if (!doc.dateISO) doc.dateISO = new Date();
    }

    // Transição para publicado imediato
    if (toPublish) {
      doc.draft = false;
      doc.published = true;
      doc.publishAt = null;
      cancelPublish(doc._id);
      doc.dateISO = new Date();
    }

    // Agendamento só pode ser alterado ANTES da liberação
    if (publishAt !== undefined && !toDraft) {
      if (doc.published === true) {
        return res
          .status(400)
          .json({ error: "Não é possível reagendar após a publicação" });
      }
      if (publishAt === "" || publishAt === null) {
        // Limpar a data = publicar agora
        doc.draft = false;
        doc.publishAt = null;
        doc.published = true;
        doc.dateISO = new Date();
      } else {
        const candidate = new Date(publishAt);
        if (Number.isNaN(candidate.getTime())) {
          return res
            .status(400)
            .json({ error: "Data de agendamento inválida" });
        }
        if (candidate.getTime() <= Date.now()) {
          return res
            .status(400)
            .json({ error: "A data de agendamento deve estar no futuro" });
        }
        cancelPublish(doc._id);
        doc.publishAt = candidate;
        doc.dateISO = candidate;
        doc.draft = false;
      }
    }

    // Pin (I-04): só faz sentido em comunicado já publicado (rascunho/agendado → 400)
    if (pinned !== undefined) {
      if (doc.published !== true) {
        return res
          .status(400)
          .json({ error: "Apenas comunicados publicados podem ser fixados" });
      }
      doc.pinned = pinned === true;
    }

    // Validade (I-05): opcional — vazio/null limpa (reativa mantendo o estado atual);
    // data válida define (passada = expiração imediata); inválida → 400.
    if (expiresAt !== undefined) {
      if (expiresAt === "" || expiresAt === null) {
        doc.expiresAt = null;
      } else {
        const candidate = new Date(expiresAt);
        if (Number.isNaN(candidate.getTime())) {
          return res.status(400).json({ error: "Data de validade inválida" });
        }
        doc.expiresAt = candidate;
      }
    }

    // Update parcial — só altera campos presentes (equivalente ao COALESCE)
    // createdBy é imutável: nunca vem do body
    if (readMode) doc.readMode = readMode;
    if (categoryId) doc.categoryId = categoryId;
    if (urgent !== undefined && urgent !== null) doc.urgent = urgent;
    if (title) doc.title = title;
    if (body) doc.body = body;
    if (author?.name) doc.author.name = author.name;
    if (author?.role) doc.author.role = author.role;

    await doc.save();

    // Agendado (não-publicado com data futura) → re-agenda a nova data
    if (!doc.published && doc.publishAt) {
      schedulePublish(doc);
    }

    if (doc.published === true) {
      emitSafe(EVENTS.POST_UPDATED, await toPost(doc));
    }

    res.json(await toPost(doc));
  } catch (err) {
    console.error("Erro ao editar comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// DELETE /api/posts/:id — exclui comunicado (somente admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    cancelPublish(req.params.id); // não deixa o timer tentar liberar um post excluído

    const doc = await Comunicado.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    // Exclui os binários primeiro para não deixar anexos órfãos no disco.
    for (const att of doc.attachments ?? []) {
      try {
        await unlink(attachmentFilePath(att.id));
      } catch {
        /* arquivo já ausente do disco — ignorar */
      }
    }

    await doc.deleteOne();
    res.status(204).end();
  } catch (err) {
    console.error("Erro ao excluir comunicado:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// POST /api/posts/:id/attachments — anexa um arquivo (somente admin, I-03)
router.post("/:id/attachments", requireAdmin, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: `Arquivo muito grande. Limite máximo é ${MAX_ATTACHMENT_MB} MB.` });
      }
      if (err.code === "UNSUPPORTED_TYPE") {
        return res
          .status(400)
          .json({ error: "Tipo de arquivo não permitido. Envie PDF ou imagem (PNG, JPEG, GIF, WebP)." });
      }
      console.error("Erro de upload:", err.message);
      return res.status(500).json({ error: "Erro interno no servidor" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    try {
      const doc = await Comunicado.findById(req.params.id);
      if (!doc) {
        try {
          await unlink(req.file.path);
        } catch {
          /* melhor esforço */
        }
        return res.status(404).json({ error: "Comunicado não encontrado" });
      }

      const attachment = {
        id: req.file.filename,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        url: `/api/posts/${req.params.id}/attachments/${req.file.filename}`,
      };
      doc.attachments = [...(doc.attachments ?? []), attachment];
      await doc.save();

      res.status(201).json(attachment);
    } catch (e) {
      console.error("Erro ao anexar arquivo:", e.message);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });
});

// GET /api/posts/:id/attachments/:attachmentId — serve o binário do anexo (I-03)
// Respeita a MESMA visibilidade do comunicado: não-elegível → 404 (não revela existência).
router.get("/:id/attachments/:attachmentId", async (req, res) => {
  try {
    const doc = await Comunicado.findById(req.params.id).lean();

    if (!doc) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }
    if (!isPostEligible(doc, req.user)) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    const attachment = (doc.attachments ?? []).find(
      (a) => a.id === req.params.attachmentId
    );
    if (!attachment) {
      return res.status(404).json({ error: "Anexo não encontrado" });
    }

    res.setHeader("Content-Type", attachment.type || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.name || "anexo")}"`
    );
    res.sendFile(attachmentFilePath(attachment.id), (sendErr) => {
      if (sendErr && !res.headersSent) {
        res.status(404).json({ error: "Anexo não encontrado" });
      }
    });
  } catch (err) {
    console.error("Erro ao servir anexo:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// DELETE /api/posts/:id/attachments/:attachmentId — remove um anexo (somente admin, I-03)
router.delete("/:id/attachments/:attachmentId", requireAdmin, async (req, res) => {
  try {
    const doc = await Comunicado.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    const attachment = (doc.attachments ?? []).find(
      (a) => a.id === req.params.attachmentId
    );
    if (!attachment) {
      return res.status(404).json({ error: "Anexo não encontrado" });
    }

    try {
      await unlink(attachmentFilePath(attachment.id));
    } catch {
      /* arquivo já ausente do disco — ignorar */
    }

    doc.attachments = doc.attachments.filter(
      (a) => a.id !== req.params.attachmentId
    );
    await doc.save();

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro ao remover anexo:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
