import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

groupSchema.index({ name: 1, tenantId: 1 }, { unique: true });

export default mongoose.model("Group", groupSchema);
