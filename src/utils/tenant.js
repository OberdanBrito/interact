import mongoose from "mongoose";

// Escopo por tenant (MT-24 — estrito): casa SOMENTE o tenant resolvido. Sem ponte para o
// legado `null` (removida no backfill da MT-24): documentos de outro tenant ou legados
// (`tenantId` nulo) NUNCA são casados.
// Normaliza o id para ObjectId: o filtro é usado tanto em find() quanto no $match de
// agregations (que não faz cast automático de tipo).
export function tenantScopeCondition(tenantId) {
  if (!tenantId) return { tenantId: null };
  const tid = mongoose.Types.ObjectId.isValid(tenantId)
    ? new mongoose.Types.ObjectId(tenantId)
    : tenantId;
  return { tenantId: tid };
}

// Verifica se um documento pertence ao escopo do tenant (MT-24 — estrito):
// aceita SOMENTE candidato cujo tenantId é exatamente o tenant da requisição.
export function inTenantScope(doc, tenantId) {
  return String(doc.tenantId) === String(tenantId);
}
