import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    subdomain: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    domain: {
      type: String,
      default: null,
    },
    // settings é Mixed (MT-27): armazena a configuração do provedor de e-mail por tenant.
    // Subestrutura esperada de settings.emailProvider:
    //   { type: 'smtp'|'api', host, port, secure, authUser, secretEncrypted,
    //     fromAddress, fromName, updatedBy, updatedAt }
    // 'secretEncrypted' guarda o segredo cifrado ("iv:tag:data" hex via src/crypto.js);
    // nunca é exposto em texto claro nas respostas.
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    plan: {
      type: String,
      default: "free",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Índices de unicidade (MT-19): slug e subdomain únicos por tenant.
// subdomain é sparse para permitir múltiplos valores nulos.
tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ subdomain: 1 }, { unique: true, sparse: true });

export default mongoose.model("Tenant", tenantSchema);
