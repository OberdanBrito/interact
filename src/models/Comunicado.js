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
      default: "geral",
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
      default: "",
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
    // Agendamento de publicação (I-01)
    publishAt: {
      type: Date,
      default: null,
    },
    published: {
      type: Boolean,
      default: true,
    },
    // Rascunho (I-02): salvo sem publicar, editável com campos incompletos
    draft: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Comunicado", comunicadoSchema);
