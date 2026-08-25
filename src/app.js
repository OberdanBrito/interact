import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes);

// Health check (sem auth)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

export default app;
