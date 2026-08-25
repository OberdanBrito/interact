import { Router } from "express";
import auth from "../middleware/auth.js";

const router = Router();

const CATEGORIES = [
  { id: "todas", label: "Todas" },
  { id: "geral", label: "Geral" },
  { id: "rh", label: "RH" },
  { id: "ti", label: "TI" },
  { id: "beneficios", label: "Benefícios" },
];

// GET /api/categories — requer autenticação
router.get("/", auth, (req, res) => {
  res.json(CATEGORIES);
});

export default router;
