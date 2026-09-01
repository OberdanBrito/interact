import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    liked: {
      type: Boolean,
      default: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    likedAt: {
      type: Date,
      default: null,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

interactionSchema.index({ tenantId: 1, postId: 1, userId: 1 }, { unique: true });
interactionSchema.index({ tenantId: 1, userId: 1, read: 1, postId: 1 });

export default mongoose.model("Interaction", interactionSchema);
