import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
    },
    groupIds: { type: [String], default: [] },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1, tenantId: 1 }, { unique: true });

export default mongoose.model("User", userSchema);
