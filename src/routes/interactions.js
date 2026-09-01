import { Router } from "express";
import Interaction from "../models/Interaction.js";
import Comunicado from "../models/Comunicado.js";
import User from "../models/User.js";
import Group from "../models/Group.js";
import auth from "../middleware/auth.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

// Todas as rotas deste arquivo requerem autenticação
router.use(auth);

// Verifica se o usuário pode ver/interagir com o comunicado
// (mesma regra de visibilidade usada em GET /api/posts/:id)
async function isEligible(user, postId) {
  const doc = await Comunicado.findById(postId).lean();
  if (!doc) return false;
  const targetGroups = doc.targetGroups ?? [];
  if (user.role === "admin") return String(doc.createdBy) === String(user.id);
  return (
    targetGroups.length === 0 ||
    targetGroups.some((g) => user.groupIds.includes(g))
  );
}

// PUT /api/interactions/:postId — colaborador sincroniza seu estado
//   body: { liked?: boolean, read?: boolean }
//   Upsert do doc (postId, userId); grava readAt/likedAt nas transições.
router.put("/:postId", async (req, res) => {
  const { postId } = req.params;
  const { liked, read } = req.body ?? {};

  if (liked === undefined && read === undefined) {
    return res.status(400).json({ error: "Informe liked e/ou read" });
  }
  if (liked !== undefined && typeof liked !== "boolean") {
    return res.status(400).json({ error: "liked deve ser booleano" });
  }
  if (read !== undefined && typeof read !== "boolean") {
    return res.status(400).json({ error: "read deve ser booleano" });
  }

  try {
    if (!(await isEligible(req.user, postId))) {
      return res.status(404).json({ error: "Comunicado não encontrado" });
    }

    const patch = {};
    if (liked !== undefined) patch.liked = liked;
    if (read !== undefined) patch.read = read;

    const existing = await Interaction.findOne({ postId, userId: req.user.id });

    if (liked === true && !existing?.liked) patch.likedAt = new Date();
    if (liked === false && existing?.liked) patch.likedAt = null;
    if (read === true && !existing?.read) patch.readAt = new Date();
    if (read === false && existing?.read) patch.readAt = null;

    const doc = await Interaction.findOneAndUpdate(
      { postId, userId: req.user.id },
      { $set: patch, $setOnInsert: { postId, userId: req.user.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ postId, liked: doc.liked, read: doc.read });
  } catch (err) {
    console.error("Erro ao sincronizar interação:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// GET /api/interactions/me — estado do usuário em todos os posts visíveis
//   Usado para restaurar o estado (likes/leituras) num novo dispositivo.
router.get("/me", async (req, res) => {
  try {
    const docs = await Interaction.find({ userId: req.user.id }).lean();
    const result = {};
    for (const d of docs) {
      result[d.postId] = { liked: d.liked, read: d.read };
    }
    res.json(result);
  } catch (err) {
    console.error("Erro ao buscar interações do usuário:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// GET /api/interactions/members?postId=... — admin: lista quem leu/curtiu
router.get("/members", requireAdmin, async (req, res) => {
  const { postId } = req.query;
  if (!postId) {
    return res.status(400).json({ error: "postId é obrigatório" });
  }
  try {
    const docs = await Interaction.find({ postId }).lean();
    const userMap = new Map();
    const userIds = docs.map((d) => d.userId);
    if (userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds } })
        .select("name email groupIds")
        .lean();
      const groups = await Group.find().select("name").lean();
      const nameById = new Map(groups.map((g) => [String(g._id), g.name]));
      for (const u of users) {
        userMap.set(String(u._id), {
          name: u.name,
          email: u.email,
          groups: (u.groupIds ?? [])
            .map((id) => nameById.get(String(id)) ?? null)
            .filter(Boolean),
        });
      }
    }
    res.json(
      docs.map((d) => ({
        postId: d.postId,
        user: userMap.get(String(d.userId)) ?? null,
        liked: d.liked,
        read: d.read,
        readAt: d.readAt ? new Date(d.readAt).toISOString() : null,
        likedAt: d.likedAt ? new Date(d.likedAt).toISOString() : null,
      }))
    );
  } catch (err) {
    console.error("Erro ao listar interações:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// GET /api/interactions/summary — admin: métricas de todos os posts em uma chamada
//   Filtros opcionais (retrocompatíveis): desde/ate (ISO) e groupId.
router.get("/summary", requireAdmin, async (req, res) => {
  const { desde, ate, groupId } = req.query;

  const parseDate = (value) => {
    if (value === undefined) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "invalid" : d;
  };
  const desdeDate = parseDate(desde);
  const ateDate = parseDate(ate);
  if (desdeDate === "invalid" || ateDate === "invalid") {
    return res.status(400).json({ error: "Data inválida" });
  }

  try {
    let interactions = await Interaction.find({}).lean();

    if (desdeDate || ateDate) {
      const inRange = (d) => {
        if (!d) return false;
        const time = new Date(d).getTime();
        if (desdeDate && time < desdeDate.getTime()) return false;
        if (ateDate && time > ateDate.getTime()) return false;
        return true;
      };
      interactions = interactions.filter((i) => inRange(i.readAt) || inRange(i.likedAt));
    }

    if (groupId) {
      const userIds = [...new Set(interactions.map((i) => String(i.userId)))];
      const users = userIds.length
        ? await User.find({ _id: { $in: userIds } }).select("groupIds").lean()
        : [];
      const groupIdsByUser = new Map(
        users.map((u) => [String(u._id), u.groupIds ?? []])
      );
      interactions = interactions.filter((i) =>
        (groupIdsByUser.get(String(i.userId)) ?? []).some(
          (g) => String(g) === String(groupId)
        )
      );
    }

    const summary = {};
    for (const i of interactions) {
      const slot = summary[i.postId] ?? { reads: 0, likes: 0 };
      if (i.read) slot.reads++;
      if (i.liked) slot.likes++;
      summary[i.postId] = slot;
    }
    res.json(summary);
  } catch (err) {
    console.error("Erro ao resumir interações:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// GET /api/interactions?postId=... — admin: agregado (total e por grupo)
router.get("/", requireAdmin, async (req, res) => {
  const { postId } = req.query;
  if (!postId) {
    return res.status(400).json({ error: "postId é obrigatório" });
  }
  try {
    const interactions = await Interaction.find({ postId }).lean();
    const userIds = interactions.map((d) => d.userId);
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select("groupIds")
          .lean()
      : [];
    const groups = await Group.find().select("name").lean();
    const nameById = new Map(groups.map((g) => [String(g._id), g.name]));

    let totalReads = 0;
    let totalLikes = 0;
    const perGroup = new Map(); // groupName -> { reads, likes }

    for (const i of interactions) {
      if (i.read) totalReads++;
      if (i.liked) totalLikes++;
      const user = users.find((u) => String(u._id) === String(i.userId));
      const groupIds = user?.groupIds ?? [];
      if (groupIds.length === 0) {
        const key = "Sem grupo";
        const slot = perGroup.get(key) ?? { reads: 0, likes: 0, users: 0 };
        if (i.read) slot.reads++;
        if (i.liked) slot.likes++;
        perGroup.set(key, slot);
      } else {
        for (const gid of groupIds) {
          const key = nameById.get(String(gid)) ?? "Sem grupo";
          const slot = perGroup.get(key) ?? { reads: 0, likes: 0, users: 0 };
          if (i.read) slot.reads++;
          if (i.liked) slot.likes++;
          perGroup.set(key, slot);
        }
      }
    }

    res.json({
      postId,
      totalReads,
      totalLikes,
      byGroup: Array.from(perGroup.entries()).map(([name, counts]) => ({
        name,
        reads: counts.reads,
        likes: counts.likes,
      })),
    });
  } catch (err) {
    console.error("Erro ao agregar interações:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// GET /api/interactions/:postId — estado do próprio usuário
//   (colaborador: só o próprio doc; admin: agregado do post)
router.get("/:postId", async (req, res) => {
  const { postId } = req.params;
  try {
    if (req.user.role === "admin") {
      const interactions = await Interaction.find({ postId }).lean();
      let totalReads = 0;
      let totalLikes = 0;
      for (const i of interactions) {
        if (i.read) totalReads++;
        if (i.liked) totalLikes++;
      }
      return res.json({ postId, totalReads, totalLikes, byGroup: [] });
    }
    const doc = await Interaction.findOne({
      postId,
      userId: req.user.id,
    }).lean();
    res.json({
      postId,
      liked: doc?.liked ?? false,
      read: doc?.read ?? false,
    });
  } catch (err) {
    console.error("Erro ao buscar interação:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
