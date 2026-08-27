import jwt from "jsonwebtoken";
import User from "../models/User.js";

const SECRET = process.env.JWT_SECRET;

export default async function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    const user = await User.findById(payload.id).lean();
    req.user.groupIds = user?.groupIds ?? [];
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
