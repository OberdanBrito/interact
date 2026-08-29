import schedule from "node-schedule";
import Comunicado from "./models/Comunicado.js";

// Libera um comunicado agendado (idempotente — só faz efeito uma vez)
async function release(id) {
  const doc = await Comunicado.findOneAndUpdate(
    { _id: id, published: false },
    { published: true },
    { new: true }
  ).lean();
  if (doc) {
    console.log(`✔ Comunicado ${id} liberado para visualização`);
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

export { schedulePublish, cancelPublish, reconcile };