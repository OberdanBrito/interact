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
  },
  { timestamps: true }
);

// Um documento por (comunicado, usuário) — fonte única da interação
interactionSchema.index({ postId: 1, userId: 1 }, { unique: true });
// Suporta o conjunto "read" do usuário usado na ordenação por não-lido (I-10).
interactionSchema.index({ userId: 1, read: 1, postId: 1 });

export default mongoose.model("Interaction", interactionSchema);
