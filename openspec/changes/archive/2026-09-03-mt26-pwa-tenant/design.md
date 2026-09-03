## Context

Ver proposal.md - Why. Estado atual (fonte: `src/`):
- `API_BASE` é constante build-time (`import.meta.env.VITE_API_URL || "http://localhost:3002"`) em `data/posts.js` (login, posts, interactions, attachment) e `data/events.js` (EventSource).
- `core/utils.js` define `STORAGE_KEYS` fixos (`interact.session`, `interact.user.`, `interact.syncQueue`, `interact.lastGroup`, `interact.installDismissed`) usados em `session.js`, `sync.js`, `feed.js`, `pwa.js`.
- `data/cache.js`: `const db = new Dexie("interact-cache")` module-level (não por tenant; sem lazy init).
- `features/install/pwa.js`: `registerSW({ immediate:true })` (vite-plugin-pwa; manifest/scope em build) + storage `dismissInstall`.
- `app/main.js::init()` chama `restoreSession()` (sem resolução de tenant).
- Backend (MT-24): login retorna `user.tenantId`; resolução de tenant aceita header/subdomínio/claim. Admin (MT-25) já resolve tenant do host.

## Goals / Non-Goals

**Goals:**
- `src/core/tenant.js` com `resolveTenant()` (subdomínio → `state.tenant = { subdomain, slug, apiBase }`), `getApiBase()` e `getTenantSlug()`; chamado no init antes de `restoreSession`.
- Storage, fila offline e Dexie isolados por tenant; `API_BASE` em runtime; manifest/SW conforme o tenant.

**Non-Goals:**
- Não mudar o comportamento das telas/feed (a visibilidade/ordenação continua a mesma).
- Não criar build/server por tenant — o PWA é o mesmo bundle; a variação é em runtime (storage/cache/API) e no manifest injetado.
- Não migrar chaves antigas (sem migração; relogin no tenant).
- Não alterar o backend (a resolução já suporta subdomínio; o login com `X-Tenant-Slug` é uso, não mudança).

## Decisions

**D1 — `src/core/tenant.js`.** `resolveTenant()`: `location.hostname` → subdomínio (1º segmento, ignorando IP via `/^\d+$/` e `localhost`) → `slug`; `apiBase = subdomain ? window.location.origin : (import.meta.env.VITE_API_URL || window.location.origin)` (produção same-origin — o backend resolve o tenant via subdomínio; dev usa `VITE_API_URL`, ex.: `http://localhost:3002`). Exporta `resolveTenant()`, `getTenantSlug()` (default `"interna"`), `getApiBase()` (default `window.location.origin`). Alternativa considerada: manter `VITE_API_URL` global — descartado (não é per-tenant nem runtime).

**D2 — Chaves de storage por tenant (`core/utils.js`).** Substituir `STORAGE_KEYS` fixo por helpers que prefixam com o slug: `sessionKey()` → `interact.<slug>.session`; `userDataKey(email)` → `interact.<slug>.user.<email>`; `syncQueueKey()` → `interact.<slug>.syncQueue`; `lastGroupKey()` → `interact.<slug>.lastGroup`; `dismissInstallKey()` → `interact.<slug>.installDismissed`. **Nota (decisão gravada):** o prefixo usa o **slug** do subdomínio (identidade do tenant no nível da URL, conhecida no bootstrap), não o `tenantId` (que só se sabe pós-login); o `tenantId` fica dentro da sessão. Isso atende o isolamento "por tenant" da issue sem exigir uma chamada de API antes do login. O `state.tenant` é a única fonte do slug (fallback `"interna"`).

**D3 — Dexie por tenant (`data/cache.js`).** `getDb()` cria/retorna um `Dexie` com nome `interact-cache-<slug>` (lazy por tenant; fecha o anterior se o slug mudar). As funções `cachePosts`/`getCachedPosts`/`getCachedPost`/`removeCachedPost`/`clearCache` usam `getDb()`. `clearCache` limpa o DB do tenant corrente (logout).

**D4 — API_BASE runtime.** Em `data/posts.js` e `data/events.js`, substituir `const API_BASE = ...` por `import { getApiBase } from "../core/tenant.js"` e usar `getApiBase()` em cada fetch/EventSource. O login envia `X-Tenant-Slug: state.tenant.slug` (assim o backend resolve o tenant mesmo em dev; em produção o subdomínio já resolve). Alternativa: criar `data/http.js` no PWA como no admin — descartado por escopo (o PWA já tem `posts.js` com token; apenas centralizamos a base).

**D5 — Manifest por tenant (runtime).** Novo helper em `features/install/pwa.js` (ou `core/manifest.js`): `applyTenantManifest()` gera um `manifest.webmanifest` (Blob) com `name`/`short_name` (ex.: "Interact — <slug>"), `start_url`/`scope` do tenant (default `/`) e injeta `<link rel="manifest" href="<blobURL>">` antes de `registerSW`. O SW (`registerSW`) permanece por origem/scope `"/"` (cada subdomínio é sua própria origem → isolamento de SW/cache por tenant). Alternativa: split build por tenant — descartado (fora do escopo de um worktree SPA).

**D6 — Init em `app/main.js`.** `resolveTenant()` chamado primeiro (antes de `restoreSession()`); sessão, cache, fila e manifest resolvem contra o tenant corrente.

## Risks / Trade-offs

- [Chaves antigas deixam de ser lidas] → sem migração; relogin. Aceitável (breaking frontend, documentado).
- [`apiBase` do dev usa `VITE_API_URL`] → só em dev sem subdomínio; produção usa `window.location.origin` (same-origin). Se o PWA for servido separado da API em prod, `VITE_API_URL`/mapping por tenant deve ser configurado (documentado como ponto de deploy).
- [Manifest injetado em runtime pode divergir do build] → o `<link rel=manifest>` do index.html é sobrescrito em runtime; `registerSW` continua registrando o SW do build (scope `/`). SW por subdomínio isola por tenant.
- [Dexie lazy por slug com `state.tenant` ainda não resolvido] → `getTenantSlug()` tem fallback `"interna"`; a ordem (resolveTenant antes de qualquer acesso a cache) é garantida pelo `main.js`.

## Migration Plan

1. Deploy do PWA (build) — sem migração; chaves antigas ignoradas; relogin.
2. Sem rollback estrutural (reverter restaura o single-tenant).
3. Validação: `npm run build` (Vite) + QA do login/feed por tenant (subdomínio ou dev default).

## Open Questions

Nenhuma bloqueante. Ponto de deploy: em produção, se API e PWA forem servidos em origens diferentes, definir a base da API por tenant (via subdomínio/origem ou `VITE_API_URL` de deploy).
