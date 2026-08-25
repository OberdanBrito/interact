import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";

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
    const user = await User.findOne({ email: email.toLowerCase() }).lean();

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role },
      SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Erro no login:", err.message);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
