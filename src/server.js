import "dotenv/config";
import { mkdirSync } from "node:fs";
import app from "./app.js";
import connectDB from "./db/connection.js";
import { reconcile, startExpiredSweep } from "./scheduler.js";
import { UPLOAD_DIR } from "./upload.js";

const PORT = process.env.PORT || 3001;

// Garante o diretório de uploads de anexos (I-03)
mkdirSync(UPLOAD_DIR, { recursive: true });

// Conecta no MongoDB antes de subir as rotas
await connectDB();

// Re-sincroniza agendamentos pendentes (timers não sobrevivem a restart)
await reconcile();

// Emite post:expired para comunicados cuja validade (I-05) venceu (I-07)
startExpiredSweep();

app.listen(PORT, () => {
  console.log(`✔ Interact API rodando em http://localhost:${PORT}`);
});
