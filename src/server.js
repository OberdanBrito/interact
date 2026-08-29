import "dotenv/config";
import app from "./app.js";
import connectDB from "./db/connection.js";
import { reconcile } from "./scheduler.js";

const PORT = process.env.PORT || 3001;

// Conecta no MongoDB antes de subir as rotas
await connectDB();

// Re-sincroniza agendamentos pendentes (timers não sobrevivem a restart)
await reconcile();

app.listen(PORT, () => {
  console.log(`✔ Interact API rodando em http://localhost:${PORT}`);
});
