import "dotenv/config";
import app from "./app.js";
import connectDB from "./db/connection.js";

const PORT = process.env.PORT || 3001;

// Conecta no MongoDB antes de subir as rotas
await connectDB();

app.listen(PORT, () => {
  console.log(`✔ Interact API rodando em http://localhost:${PORT}`);
});
