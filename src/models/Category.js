import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    // slug é o identificador público curto (ex.: "rh") — valor usado em Comunicado.categoryId.
    slug: { type: String, required: true },
    label: { type: String, required: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

categorySchema.index({ slug: 1, tenantId: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);
