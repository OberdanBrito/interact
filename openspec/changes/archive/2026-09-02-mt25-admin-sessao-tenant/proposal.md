## Why

O backend (MT-24) já é 100% escopado por tenant, mas o **frontend_admin** ainda é single-tenant: a sessão é guardada em uma chave fixa (`interact-admin/session`), as requests não enviam a identidade do tenant (`X-Tenant-Id`), e o acesso é independente do domínio. Em produção multi-tenant (`acme.interact.app` / `beta.interact.app`), dois tenants no mesmo browser sobrescreveriam a sessão um do outro e o admin não saberia a qual instância está logado — o backend rejeitaria (403) ou serviria dados do tenant errado. Precisamos tornar o admin por tenant ponta a ponta.

## What Changes

- **Camada HTTP central** — novo `src/data/http.js` (API_BASE, token, tenantId, `authHeaders()` incluindo `X-Tenant-Id`, e helpers `apiGet`/`apiPost`/`apiPut`/`apiDelete`); `posts.js`/`groups.js` refatorados para usá-la (sem mudar assinaturas exportadas).
- **Resolução do tenant no bootstrap** — `main.js` resolve o tenant do host (`location.hostname` → subdomínio) antes de restaurar a sessão, definindo `state.tenant` (com fallback de dev).
- **Sessão por tenant** — `login()` injeta `tenantId` na sessão e grava sob chave composta por tenant (`interact-admin:<slug>/session`); `state.user.tenantId` preenchido.
- **`restoreSession()` valida pertencimento** — restaura a sessão somente se ela pertence ao tenant atual; caso contrário descarta e força login.
- **`authHeaders()` envia `X-Tenant-Id`** nas requests autenticadas (Authorization + Content-Type + X-Tenant-Id).
- **BREAKING (frontend)** — o login passa a exigir/identificar o tenant (via `X-Tenant-Slug` no login e `X-Tenant-Id` nas demais chamadas); sessões antigas (chave fixa) deixam de ser consideradas (simplesmente ignoradas, sem migração).

## Capabilities

### New Capabilities
- `sessao-admin`: autenticação de sessão do painel admin por tenant — resolução do tenant no bootstrap, chave de storage isolada por tenant, `authHeaders` com identidade do tenant e validação de pertencimento da sessão.

### Modified Capabilities
<!-- Nenhuma: comportamento das telas de posts/grupos/dashboard não muda; apenas a camada HTTP interna é refatorada. -->
(nenhuma)

## Impact

- **frontend_admin** (`src/`): `data/http.js` (novo, central), `app/main.js` (resolução do tenant), `core/state.js` (`state.tenant`, `state.user.tenantId`), `core/utils.js` (chave de storage por tenant), `features/auth/session.js` (login/restore por tenant), `data/posts.js`/`data/groups.js` (refatorados para `http.js`).
- **API**: as requests autenticadas passam a incluir `X-Tenant-Id`; o login passa a incluir `X-Tenant-Slug` (a chave do tenant é o slug do subdomínio; o id é obtido no login). Nenhuma mudança no backend (a resolução já suporta header/subdomínio/claim).
- **Build/QA**: `npm run build` (Vite) deve passar; QA visual do fluxo de login multi-tenant (subdomínio ou header) quando disponível.
- **Sem impacto** no backend nem no PWA (payloads e contrato mantidos).
