## 1. Núcleo de tenant

- [x] 1.1 Criar `src/core/tenant.js` com `resolveTenant()` (subdomínio → `state.tenant = { subdomain, slug, apiBase }`; fallback dev), `getTenantSlug()` (default `"interna"`) e `getApiBase()` (default `window.location.origin`) — verificar com `node --check`.
- [x] 1.2 Em `src/core/state.js`, adicionar `tenant: null` — verificar com `node --check`.
- [x] 1.3 Em `src/app/main.js`, chamar `resolveTenant()` **antes** de `restoreSession()` — verificar ordem.

## 2. Storage por tenant

- [x] 2.1 Em `src/core/utils.js`, substituir `STORAGE_KEYS` fixos por helpers com prefixo do tenant (`sessionKey()`, `userDataKey(email)`, `syncQueueKey()`, `lastGroupKey()`, `dismissInstallKey()`) — verificar com `node --check`.
- [x] 2.2 Atualizar `src/features/auth/session.js` (sessão + userData), `src/data/sync.js` (fila), `src/features/feed/feed.js` (lastGroup) e `src/features/install/pwa.js` (dismissInstall) para usar os novos helpers — verificar com `node --check`.

## 3. Cache Dexie por tenant

- [x] 3.1 Em `src/data/cache.js`, tornar o DB lazy por tenant (`getDb()` → `interact-cache-<slug>`) e usar em todas as funções; `clearCache` limpa o DB do tenant corrente — verificar com `node --check`.

## 4. API_BASE runtime

- [x] 4.1 Em `src/data/posts.js`, substituir a constante `API_BASE` por `getApiBase()` (importando de `core/tenant.js`) em todos os fetches e em `getAttachmentUrl`; login envia `X-Tenant-Slug: state.tenant.slug` — verificar com `node --check`.
- [x] 4.2 Em `src/data/events.js`, substituir `API_BASE` por `getApiBase()` no `EventSource` — verificar com `node --check`.

## 5. Manifest/SW por tenant

- [x] 5.1 Em `src/features/install/pwa.js`, adicionar `applyTenantManifest()` (Blob do manifest com `name`/`short_name`/`start_url`/`scope` do tenant e `<link rel="manifest">`) e chamar antes de `registerSW` — verificar com `node --check`.

## 6. Validação

- [x] 6.1 Rodar `node --check` em todos os arquivos alterados — verificar sem erros.
- [x] 6.2 Rodar `npm run build` (Vite) — verificar build exit 0.
- [x] 6.3 QA visual do fluxo (dev `localhost` → tenant default): login OK → `:3002` com `X-Tenant-Slug`; chaves `interact.interna.session` / `interact.interna.user.<email>`; manifest injetado como Blob.

## 7. Documentação

- [x] 7.1 Atualizar `AGENTS.md` (main) com a convenção MT-26 (PWA por tenant: tenant.js, storage/Dexie/API_BASE runtime, manifest) — verificar commit na main.
