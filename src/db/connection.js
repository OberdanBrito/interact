import mongoose from "mongoose";

// Promise da conexão em andamento — guard para não reconectar
let connecting = null;

async function connectDB() {
  // Já conectado → retorna a conexão existente
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Conexão em andamento → reutiliza a mesma promise
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGODB_URI)
      .then(() => mongoose.connection)
      .catch((err) => {
        console.error("Erro ao conectar no MongoDB:", err.message);
        process.exit(1);
      });
  }

  return connecting;
}

export default connectDB;
