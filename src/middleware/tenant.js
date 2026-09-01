import Tenant from "../models/Tenant.js";

// Fallback de dev: tenant default quando nenhuma fonte identifica um tenant.
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "interna";
const CACHE_TTL_MS = 60 * 1000;

// Cache em memória: chave "slug:<v>" | "sub:<v>" | "id:<v>" -> { doc, ts }
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return hit.doc;
  }
  cache.delete(key);
  return null;
}

function cacheSet(key, doc) {
  if (doc) {
    cache.set(key, { doc, ts: Date.now() });
  } else {
    cache.delete(key);
  }
}

async function findTenantBy(key, value) {
  const ck = `${key}:${value}`;
  const cached = cacheGet(ck);
  if (cached) return cached;

  const query = {};
  if (key === "id") query._id = value;
  else if (key === "subdomain") query.subdomain = value;
  else query.slug = value;

  const doc = await Tenant.findOne({ ...query, active: true }).lean();
  cacheSet(ck, doc);
  return doc;
}

/**
 * Resolve o tenant de uma requisição seguindo a precedência:
 * header (X-Tenant-Id | X-Tenant-Slug) → subdomínio do host → claim tenantId do JWT.
 * Retorna o documento do tenant ativo ou null.
 */
export async function resolveTenant(req) {
  // 1) Header explícito (maior precedência)
  const headerValue = req.get("X-Tenant-Id") || req.get("X-Tenant-Slug");
  if (headerValue) {
    const isId = /^[a-f\d]{24}$/i.test(headerValue);
    const doc = isId
      ? await findTenantBy("id", headerValue)
      : await findTenantBy("slug", headerValue.toLowerCase());
    if (doc) return doc;
  }

  // 2) Subdomínio do host (ex.: acme.interact.app -> "acme")
  const hostname = req.hostname || "";
  if (hostname) {
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0]) {
      const doc = await findTenantBy("subdomain", parts[0].toLowerCase());
      if (doc) return doc;
    }
  }

  // 3) Claim tenantId do JWT (quando autenticado)
  if (req.user?.tenantId) {
    const doc = await findTenantBy("id", req.user.tenantId);
    if (doc) return doc;
  }

  return null;
}

/**
 * Middleware que seta req.tenant / req.tenantId.
 * Nunca bloqueia a requisição por falta de tenant: usa o tenant default em
 * ambiente não-produção (preserva o comportamento atual) ou deixa null.
 */
export function resolveTenantMiddleware(req, res, next) {
  resolveTenant(req)
    .then((tenant) => {
      if (tenant) {
        req.tenant = tenant;
        req.tenantId = tenant._id ? String(tenant._id) : null;
        return next();
      }

      // Fallback de dev: tenant default (não bloqueia)
      if (process.env.NODE_ENV !== "production" && DEFAULT_TENANT_SLUG) {
        return findTenantBy("slug", DEFAULT_TENANT_SLUG).then((def) => {
          req.tenant = def;
          req.tenantId = def ? String(def._id) : null;
          next();
        });
      }

      // Produção sem tenant identificável: segue com null (rotas públicas não quebram)
      req.tenant = null;
      req.tenantId = null;
      next();
    })
    .catch((err) => {
      console.error("Erro ao resolver tenant:", err.message);
      req.tenant = null;
      req.tenantId = null;
      next();
    });
}

export default resolveTenantMiddleware;
