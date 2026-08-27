import mongoose from "mongoose";

const comunicadoSchema = new mongoose.Schema(
  {
    // ID público customizado no formato p01, p02, ...
    _id: {
      type: String,
    },
    readMode: {
      type: String,
      enum: ["auto", "ack"],
      default: "auto",
    },
    categoryId: {
      type: String,
      required: true,
    },
    urgent: {
      type: Boolean,
      default: false,
    },
    likeBase: {
      type: Number,
      default: 0,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: [String],
      default: [],
    },
    targetGroups: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    author: {
      name: { type: String, default: null },
      role: { type: String, default: null },
      _id: false,
    },
    dateISO: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Comunicado", comunicadoSchema);
