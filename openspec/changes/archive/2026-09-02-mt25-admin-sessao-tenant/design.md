## Context

Ver proposal.md - Why. Estado atual (fonte: `src/`):
- `main.js` (3 linhas) apenas chama `restoreSession()` e `initRouter()` — sem resolução de tenant.
- `data/posts.js` e `data/groups.js` duplicam `API_BASE`, `TOKEN`/`setToken` e `authHeaders()` (header só `Authorization`+`Content-Type`; sem identidade de tenant). Login retorna `{ email, name, token }`; não guarda `tenantId`.
- `core/state.js` tem `user`, sem `tenant` e sem `user.tenantId`.
- `core/utils.js` define `STORAGE_KEYS.session` como chave fixa `interact-admin/session`.
- `features/auth/session.js`: `restoreSession()` lê a chave fixa; `login()` grava `user` (sem `tenantId`); `logout()` remove a chave.
- Backend (MT-24): login retorna `user.tenantId` (ObjectId string) e a resolução de tenant aceita header `X-Tenant-Id`/`X-Tenant-Slug` → subdomínio → claim JWT.

## Goals / Non-Goals

**Goals:**
- Centralizar a camada HTTP do admin (uma fonte de API_BASE/token/tenantId/headers) e refatorar `posts.js`/`groups.js`.
- Resolver o tenant do host no bootstrap (`state.tenant`).
- Isolar sessão/storage por tenant e injetar `tenantId` na sessão; enviar `X-Tenant-Id` nas requests autenticadas; `restoreSession` valida pertencimento.

**Non-Goals:**
- Não mudar o backend (a resolução já suporta header/subdomínio/claim — resta usar).
- Não mudar o contrato das views (assinaturas exportadas de `posts.js`/`groups.js` mantidas).
- Não migrar sessões antigas de chave fixa (simplesmente não são mais lidas; sem migração).

## Decisions

**D1 — `src/data/http.js` central.** Exporta `API_BASE`, `getToken()`, `setToken()`, `setTenantId()`, `getTenantId()`, `authHeaders()` (Authorization + Content-Type + `X-Tenant-Id` quando `tenantId` presente) e helpers `apiGet(path)`, `apiPost(path, body)`, `apiPut(path, body)`, `apiDelete(path)` que aplicam `authHeaders()` (opcionalmente um `auth` flag para chamadas sem token, ex.: login). Alternativa considerada: criar um módulo `api-client` com interceptor — descartado por complexidade; os helpers diretos são suficientes e mantêm o padrão atual.

**D2 — Resolução do tenant no bootstrap (`main.js`).** Nova função (em `core/utils.js` ou `features/auth/session.js`): `resolveTenantFromHost()` lê `location.hostname`; se houver mais de 2 partes (subdomínio), usa a primeira como `slug`; senão (dev) usa `import.meta.env.VITE_DEFAULT_TENANT_SLUG || "interna"`. Define `state.tenant = { subdomain, slug }`. Chamada **antes** de `restoreSession()`. Alternativa: resolver só via env — descartado (o subdomínio é a fonte canônica em produção).

**D3 — Sessão e storage por tenant.** `STORAGE_KEYS.session` deixa de ser string fixa e vira função `sessionKey(slug)` → `interact-admin:<slug>/session`. `state.user.tenantId` preenchido no login. `login()` chama `apiLogin(email, password)` que envia `X-Tenant-Slug: state.tenant.slug` (para o backend resolver o tenant mesmo em dev/localhost) e, com a resposta (que inclui `user.tenantId`), grava `{ email, name, role, tenantId, tenantSlug, token }` sob `sessionKey(slug)` e propaga `setToken(token)` + `setTenantId(tenantId)` para `http.js`.

**D4 — `restoreSession()` valida pertencimento.** Lê a sessão sob `sessionKey(state.tenant.slug)`; se existe e `session.tenantSlug === state.tenant.slug` e `session.tenantId` presente, restaura (`setToken` + `setTenantId`) e retorna verdadeiro; caso contrário remove a chave e retorna falso (força login). O guard de token existente é mantido.

**D5 — Refatoração de `posts.js`/`groups.js`.** Removem `API_BASE`/`TOKEN`/`authHeaders` locais e passam a usar `http.js` (`apiGet`/`apiPost`/`apiPut`/`apiDelete` + `getToken` para os calls que hoje usam `Authorization` de forma avulsa, ex.: upload/delete/login). `login()` continua em `posts.js` (mantendo a assinatura) mas usa `http.js` + header `X-Tenant-Slug`; o `setTenantId` é chamado por `session.js` com o `tenantId` retornado.

## Risks / Trade-offs

- [Sessões de chave fixa deixam de ser lidas] → aceitável (sem migração de dados sensível; usuário reloga no tenant). Documentado como breaking no frontend.
- [Login com `X-Tenant-Slug` fixado ao slug do host] → em dev sem subdomínio usa o fallback `interna` (bate com o seed default). Em produção o `X-Tenant-Id` subsequente prevalece (precedência header) e coincide com a sessão.
- [`X-Tenant-Id` em todas as requests autenticadas] → o backend (MT-24) já resolve por header; se o admin for servido no mesmo subdomínio, tanto faz o header quanto o subdomínio — ambos isolam.
- [Refatoração de `posts.js`/`groups.js` pode alterar comportamento] → assinaturas exportadas preservadas e testes/QA do fluxo (login → listar) devem cobrir a regressão.

## Migration Plan

1. Deploy do frontend (build) — sem migração de sessão; sessões antigas (`interact-admin/session`) simplesmente deixam de ser lidas.
2. Sem rollback estrutural: reverter o commit restaura o comportamento single-tenant (sem perda).
3. Validação: `npm run build` (Vite) + `node --check` nos arquivos alterados + QA visual do login (dev `localhost` → tenant default) e, se disponível, com subdomínio/header.

## Open Questions

Nenhuma bloqueante. Ponto de atenção: o `VITE_DEFAULT_TENANT_SLUG` (env de dev) deve refletir o tenant default do seed ("interna").
