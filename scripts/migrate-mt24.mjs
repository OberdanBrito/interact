import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/db/connection.js";
import User from "../src/models/User.js";
import Group from "../src/models/Group.js";
import Comunicado from "../src/models/Comunicado.js";
import Interaction from "../src/models/Interaction.js";
import Category from "../src/models/Category.js";
import Tenant from "../src/models/Tenant.js";

// Backfill (MT-24): garante o tenant default e associa a ele todos os documentos com
// tenantId nulo/ausente (ponte legada a ser removida). Idempotente: re-executável
// sem duplicar/desassociar dados. Exportada para reuso (QA); quando invocada
// diretamente pela CLI, encerra a conexão ao final.
export async function migrate() {
  await connectDB();

  const defaultTenantSlug = process.env.DEFAULT_TENANT_SLUG || "interna";
  let defaultTenant = await Tenant.findOne({ slug: defaultTenantSlug });
  if (!defaultTenant) {
    defaultTenant = await Tenant.create({
      slug: defaultTenantSlug,
      name: "Empresa",
      subdomain: defaultTenantSlug,
      plan: "free",
      active: true,
    });
    console.log(`✔ Tenant default "${defaultTenant.slug}" criado`);
  } else {
    console.log(`✔ Tenant default "${defaultTenant.slug}" já existente`);
  }

  const target = { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
  const set = { $set: { tenantId: defaultTenant._id } };
  const collections = {
    Users: User,
    Groups: Group,
    Comunicados: Comunicado,
    Interactions: Interaction,
    Categories: Category,
  };

  for (const [label, Model] of Object.entries(collections)) {
    const res = await Model.updateMany(target, set);
    console.log(`✔ ${label}: ${res.modifiedCount} documento(s) associado(s) ao tenant default`);
  }
  console.log("✔ Migração concluída com sucesso");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .catch((err) => {
      console.error("✖ Erro durante migração:", err.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
