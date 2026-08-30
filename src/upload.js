import multer from "multer";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Diretório de armazenamento dos binários de anexos (I-03).
// Local: <raiz do backend>/uploads (gitignorado).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads");

// Limites de anexo (I-03): tamanho máximo e tipos permitidos.
// Backend é a fonte de verdade; o admin espelha os mesmos limites para UX.
export const MAX_ATTACHMENT_MB =
  Number.parseInt(process.env.MAX_ATTACHMENT_MB, 10) || 10;

const DEFAULT_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

const envTypes = (process.env.ALLOWED_ATTACHMENT_TYPES || "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

export const ALLOWED_ATTACHMENT_TYPES = new Set(
  envTypes.length > 0 ? envTypes : DEFAULT_ATTACHMENT_TYPES
);

// Extensões aceitas por MIME, usadas para montar um nome de arquivo seguro.
const EXT_BY_MIME = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Nome de arquivo = uuid (evita colisão e path traversal); ext segura por MIME.
    const ext = EXT_BY_MIME[file.mimetype] || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

// Valida tipo permitido antes de gravar.
function fileFilter(req, file, cb) {
  if (ALLOWED_ATTACHMENT_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error("Tipo de arquivo não permitido");
    err.code = "UNSUPPORTED_TYPE";
    cb(err);
  }
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_ATTACHMENT_MB * 1024 * 1024 },
  fileFilter,
});

export default upload;
