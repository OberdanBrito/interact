import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../db/pool.js";

const router = Router();
const SECRET = process.env.JWT_SECRET;

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "E-mail e senha são obrigatórios" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, email, password_hash, name, role FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = rows[0];
    const valid = bcrypt.compareSync(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Erro no login:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
