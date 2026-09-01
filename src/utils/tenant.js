import mongoose from "mongoose";

// Escopo por tenant (MT-22/MT-23): casa o tenant resolvido OU o legado `null` (ponte de
// transição até o backfill da MT-24). Documentos de OUTRO tenant nunca são casados.
// Normaliza o id para ObjectId: o filtro é usado tanto em find() quanto no $match de
// agregations (que não faz cast automático de tipo).
export function tenantScopeCondition(tenantId) {
  if (!tenantId) return { tenantId: null };
  const tid = mongoose.Types.ObjectId.isValid(tenantId)
    ? new mongoose.Types.ObjectId(tenantId)
    : tenantId;
  return { $or: [{ tenantId: tid }, { tenantId: null }] };
}

// Verifica se um documento pertence ao escopo do tenant (MT-22/MT-23):
// documento legado (tenantId nulo) é aceito na transição; de outro tenant, não.
export function inTenantScope(doc, tenantId) {
  return doc.tenantId == null || String(doc.tenantId) === String(tenantId);
}
