## Why

O Interact está migrando para SaaS multi-tenant: cada cliente/empresa passa a ser um **tenant isolado** (usuários, grupos, comunicados, interações e configurações próprias). Para isolar dados e configurar por cliente, o backend precisa de um modelo de **Tenant** e de uma forma canônica de **resolver o tenant de cada requisição** (`req.tenant`). Esta é a fundação que precede todos os demais passos (MT-20…MT-24) e que desbloqueia a #17 (provedor de e-mail por tenant) e a I-08 (e-mail fallback).

## What Changes

- **Novo modelo `Tenant`** (`src/models/Tenant.js`): `slug`, `name`, `subdomain`/`domain`, `settings` (objeto flexível), `plan` e `active`.
- **Novo middleware `resolveTenant`** (`src/middleware/tenant.js`): resolve o tenant da requisição seguindo a ordem de precedência:
  1. header `X-Tenant-Id` (ou `X-Tenant-Slug`);
  2. subdomínio do host (`req.hostname`, ex.: `acme.interact.app`);
  3. claim `tenantId` do JWT (`req.user?.tenantId`) quando já autenticado.
  Seta `req.tenant` (documento) e `req.tenantId` (string).
- **Wiring em `src/app.js`**: `app.use(resolveTenant)` montado no escopo `/api`, antes dos sub-routers.
- **Fallback de dev**: quando a resolução não encontra tenant, usa um **tenant default** via env `DEFAULT_TENANT_SLUG` (cache em memória) — preserva o comportamento atual no ambiente local.
- **Exposição do Tenant**: rota de consulta/resolução (admin) `src/routes/tenants.js` (`GET /api/tenants` e `GET /api/tenants/resolve`) + criação do tenant default no `seed`.

## Capabilities

### New Capabilities
- `multi-tenant`: modelo de Tenant + resolução do tenant por requisição (header → subdomínio → JWT) + fallback de dev. Servirá de base para os escopos por tenant (MT-20…MT-24).

### Modified Capabilities
- _(nenhuma — nenhuma spec com requisitos alterados neste passo; a modelagem e a resolução são novas, e o escopo por tenant em posts/interações/etc. será tratado nos passos MT-20…MT-24)_

## Impact

- **Arquivos novos:** `src/models/Tenant.js`, `src/middleware/tenant.js`, `src/routes/tenants.js`.
- **Arquivos alterados:** `src/app.js` (append `resolveTenant` no escopo `/api`), `src/routes/index.js` (montar `tenants`), `src/db/seed.js` (criar tenant default).
- **Sem mudança de contrato nas rotas existentes** em dev (fallback default) — nenhuma rota atual passa a exigir tenant explícito.
- **Sem mudança de banco:** permanece **single-DB** (D2) — nenhuma conexão/DB por tenant nesta etapa.
- **Fora de escopo (passos seguintes):** adicionar `tenantId` aos models (MT-20); validar pertencimento do usuário ao tenant / `tenantId` no JWT (MT-21); escopar posts, grupos, interações, categorias (MT-22/23); scheduler, SSE e migração de dados (MT-24).
