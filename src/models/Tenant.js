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
