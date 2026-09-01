import schedule from "node-schedule";
import Comunicado from "./models/Comunicado.js";
import { emitSafe, EVENTS } from "./events.js";
import { toPost } from "./routes/posts.js";

// Libera um comunicado agendado (idempotente — só faz efeito uma vez)
async function release(id) {
  const doc = await Comunicado.findOneAndUpdate(
    { _id: id, published: false },
    { published: true },
    { new: true }
  )  .lean();
  if (doc) {
    console.log(`✔ Comunicado ${id} liberado para visualização`);
    emitSafe(EVENTS.POST_NEW, await toPost(doc));
  }
  return doc;
}

// Agenda a liberação de um comunicado ainda não publicado
function schedulePublish(doc) {
  if (!doc.publishAt || doc.published) return;
  const name = String(doc._id);
  schedule.scheduleJob(name, new Date(doc.publishAt), () => {
    release(name).catch((err) =>
      console.error(`Erro ao liberar comunicado ${name}:`, err.message)
    );
  });
}

// Cancela a liberação agendada (DELETE ou reagendamento)
function cancelPublish(id) {
  schedule.cancelJob(String(id));
}

// Reconcilia agendamentos pendentes no boot:
// - publica os já vencidos (estava fora do ar no horário)
// - re-agenda os futuros (timers em memória não sobrevivem a restart)
async function reconcile() {
  const now = new Date();
  const pending = await Comunicado.find({
    published: false,
    publishAt: { $exists: true, $ne: null },
  }).lean();

  for (const doc of pending) {
    const at = new Date(doc.publishAt);
    if (at <= now) {
      await release(String(doc._id));
    } else {
      schedulePublish(doc);
    }
  }
}

// Tick de segurança — corrige atrasos em runtime (job perdido, etc.)
schedule.scheduleJob("interact-publish-tick", "* * * * *", () => {
  reconcile().catch((err) =>
    console.error("Erro no tick de agendamento:", err.message)
  );
});

// Deduplicação em memória: emitir uma vez por processo; após restart re-emitir
// para expirados é benigno (o cliente trata post:expired como idempotente).
const notifiedExpired = new Set();

function startExpiredSweep() {
  const intervalMs = Number.parseInt(process.env.SSE_EXPIRED_SWEEP_MS, 10) || 60000;
  const tick = async () => {
    try {
      const now = new Date();
      const expired = await Comunicado.find({
        published: true,
        expiresAt: { $exists: true, $ne: null, $lt: now },
      }).lean();
      for (const doc of expired) {
        const id = String(doc._id);
        if (notifiedExpired.has(id)) continue;
        notifiedExpired.add(id);
        emitSafe(EVENTS.POST_EXPIRED, { id });
      }
    } catch (err) {
      console.error("Erro no sweep de expiração:", err.message);
    }
  };
  tick();
  return setInterval(tick, intervalMs);
}

export { schedulePublish, cancelPublish, reconcile, startExpiredSweep };