## Why

O backend (MT-24) e o admin (MT-25) já são multi-tenant, mas o **PWA do colaborador** ainda é single-tenant: `API_BASE` é uma constante de build (`import.meta.env.VITE_API_URL`), as chaves de storage são fixas (`interact.session`, `interact.user.*`, `interact.syncQueue`), o cache IndexedDB (Dexie) usa um DB único (`interact-cache`) e o manifest/SW são estáticos. Em produção multi-tenant (`acme.interact.app` / `beta.interact.app`), dois tenants no mesmo navegador compartilhariam sessão, fila offline e cache; o PWA apontaria para uma API única e o manifest/SW não refletiria o tenant. Para fechar a fundação (MT-19…MT-26), o PWA precisa resolver o tenant, isolar storage/cache/fila por tenant e servir manifest/SW por tenant.

## What Changes

- **`src/core/tenant.js`** — `resolveTenant()` lê `location.hostname` (subdomínio) → `state.tenant = { subdomain, slug, apiBase }`; exporta `getApiBase()` (runtime) e `getTenantSlug()`. Chamado no init antes de `restoreSession`.
- **Storage por tenant** — chaves isoladas por tenant (slug do subdomínio): `interact.<slug>.session`, `interact.<slug>.user.<email>`, `interact.<slug>.syncQueue`, `interact.<slug>.lastGroup`, `interact.<slug>.installDismissed` (helpers em `core/utils.js`).
- **Cache Dexie por tenant** — nome do DB `interact-cache-<slug>` (lazy/init por tenant) em `src/data/cache.js`; `clearCache` fecha/limpa o DB do tenant corrente.
- **`API_BASE` em runtime** — `getApiBase()` lê `state.tenant.apiBase` (recebe `window.location.origin` em produção; fallback de dev `VITE_API_URL`); substitui a constante de build em `data/posts.js`/`data/events.js`; login envia `X-Tenant-Slug`.
- **Manifest/SW por tenant** — manifest injetado em runtime (Blob) com `name`/`short_name`/`start_url`/`scope` derivados do tenant; o SW permanece por origem (`scope: "/"`), o que já isola por subdomínio.
- **BREAKING (frontend)** — chaves antigas (`interact.session` etc.) deixam de ser lidas (sem migração; o colaborador autentica no tenant). `API_BASE` deixa de ser constante de build.

## Capabilities

### New Capabilities
- `tenant-pwa`: tornar o PWA do colaborador tenant-aware — resolução do tenant via subdomínio, armazenamento/cache/fila isolados por tenant, `API_BASE` em runtime e manifest/SW conforme o tenant.

### Modified Capabilities
<!-- Nenhuma: as capabilities existentes (busca-feed, feed-tempo-real, infinite-scroll-feed, interacoes-colaborador) descrevem comportamento que não muda; o que muda é a infraestrutura tenant (armazenamento/cache/API). -->
(nenhuma)

## Impact

- **frontend_pwa** (`src/`): `core/tenant.js` (novo), `core/state.js` (`state.tenant`), `core/utils.js` (chaves por tenant), `data/posts.js`/`data/events.js` (API_BASE runtime + X-Tenant-Slug no login), `data/cache.js` (Dexie por tenant), `data/sync.js` (fila por tenant), `features/auth/session.js` (sessão por tenant), `features/install/pwa.js` (+ manifest runtime), `features/feed/feed.js` (lastGroup por tenant), `app/main.js` (resolveTenant antes de restoreSession).
- **API**: chamadas passam a usar `getApiBase()` (runtime) e o login identifica o tenant (`X-Tenant-Slug`); em produção same-origin o backend resolve o tenant via subdomínio.
- **Build/QA**: `npm run build` (Vite) deve passar; QA do fluxo de login/feed por tenant (subdomínio ou dev default).
- **Sem impacto** no backend nem no admin (payloads e contrato mantidos).
