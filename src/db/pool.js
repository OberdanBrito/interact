import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Erro inesperado no pool do PostgreSQL:", err);
  process.exit(1);
});

export default pool;
