## 1. Camada HTTP central

- [x] 1.1 Criar `src/data/http.js` com `API_BASE`, `getToken`/`setToken`, `getTenantId`/`setTenantId`, `authHeaders()` (Authorization + Content-Type + `X-Tenant-Id` quando houver) e helpers `apiGet`/`apiPost`/`apiPut`/`apiDelete` — verificar com `node --check`.

## 2. Resolução do tenant no bootstrap

- [x] 2.1 Adicionar `resolveTenantFromHost()` (lê `location.hostname` → slug do subdomínio; fallback `VITE_DEFAULT_TENANT_SLUG || "interna"`) e definir `state.tenant` — verificar lógica com `node --check`.
- [x] 2.2 Chamar a resolução do tenant em `src/app/main.js` **antes** de `restoreSession()` — verificar ordem no arquivo.

## 3. Sessão e storage por tenant

- [x] 3.1 Em `src/core/utils.js`, tornar a chave de sessão composta por tenant (`sessionKey(slug)` → `interact-admin:<slug>/session`) — verificar com `node --check`.
- [x] 3.2 Em `src/core/state.js`, adicionar `tenant` (de `{ subdomain, slug }`) e garantir `state.user.tenantId` — verificar com `node --check`.

## 4. Login por tenant

- [x] 4.1 Em `src/data/posts.js::login`, enviar `X-Tenant-Slug: state.tenant.slug` na requisição e retornar/guardar `tenantId` — verificar que o login resolve o tenant default em dev.
- [x] 4.2 Em `src/features/auth/session.js::login`, injetar `tenantId` + `tenantSlug` na sessão, gravar sob `sessionKey(slug)` e propagar `setToken`/`setTenantId` para `http.js` — verificar sessão persistida.

## 5. Restauração de sessão valida o pertencimento

- [x] 5.1 Em `src/features/auth/session.js::restoreSession`, ler a sessão sob `sessionKey(state.tenant.slug)` e validar `session.tenantSlug === state.tenant.slug` (+ `tenantId` presente); se não bater, remover a chave e retornar falso — verificar com `node --check`.

## 6. Refatorar posts.js / groups.js para http.js

- [x] 6.1 Refatorar `src/data/posts.js` e `src/data/groups.js` para usar `http.js` (removendo `API_BASE`/`TOKEN`/`authHeaders` locais) preservando as assinaturas exportadas — verificar `npm run build`.
- [x] 6.2 `logout()` limpa também `setTenantId` (e remove a chave do tenant corrente) — verificar com `node --check`.

## 7. Validação

- [x] 7.1 Rodar `node --check` em todos os arquivos alterados — verificar sem erros.
- [x] 7.2 Rodar `npm run build` (Vite) — verificar build exit 0.
- [x] 7.3 QA visual do login (dev `localhost` → tenant default) — verificado: login → `#/posts`; sessão `interact-admin:interna/session` com `tenantId`+`tenantSlug`; `GET /api/posts` com `X-Tenant-Id`; `POST /api/auth/login` com `X-Tenant-Slug`.

## 8. Documentação

- [x] 8.1 Atualizar `AGENTS.md` (main) com a convenção MT-25 (admin por tenant: http.js, sessão/storage por tenant, X-Tenant-Id) — verificar commit na main.
