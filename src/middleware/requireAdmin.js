export default function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito a administradores" });
  }
  next();
}
