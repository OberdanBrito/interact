## 1. Modelo Tenant

- [x] 1.1 Criar `src/models/Tenant.js` com campos `slug` (unique), `name`, `subdomain`/`domain`, `settings` (Schema.Types.Mixed, default {}), `plan` (default "free") e `active` (default true) — verificar que `node --check src/models/Tenant.js` passa
- [x] 1.2 Adicionar índices de unicidade em `slug` e `subdomain` no schema — verificar que o model compila (test:integration carrega os models sem erro)

## 2. Resolução do tenant (middleware)

- [x] 2.1 Criar `src/middleware/tenant.js` exportando `resolveTenant(req)` (async) que implementa a cadeia: header `X-Tenant-Id`/`X-Tenant-Slug` → subdomínio de `req.hostname` → `req.user?.tenantId` (claim do JWT), retornando o documento ou null — verificar que a função existe e usa as 3 fontes
- [x] 2.2 Criar o middleware `resolveTenantMiddleware` que aplica `resolveTenant`, seta `req.tenant` e `req.tenantId`, e faz o fallback de dev via env `DEFAULT_TENANT_SLUG` (cache em memória) — verificar que nunca bloqueia (não chama `next(err)` / não responde 401 por falta de tenant)
- [x] 2.3 Implementar a precedência correta (header vence subdomínio vence claim) — verificar com teste unitário/por simulação: header presente → usa ele, mesmo com subdomínio divergente

## 3. Wiring no app e rotas

- [x] 3.1 Editar `src/app.js` para `app.use("/api", resolveTenantMiddleware, routes)` (import do middleware) — verificar `node --check src/app.js` e que a ordem fica antes dos sub-routers
- [x] 3.2 Editar `src/routes/index.js` para montar `tenantsRouter` em `app.use("/tenants", tenantsRouter)` — verificar `node --check src/routes/index.js`

## 4. Rota de exposição do Tenant

- [x] 4.1 Criar `src/routes/tenants.js` com `GET /api/tenants` (lista de tenants, admin) e `GET /api/tenants/resolve` (retorna `req.tenant` resolvido) — verificar que a rota responde JSON e que `/tenants/resolve` reflete o tenant da requisição

## 5. Configuração e Seed do tenant default

- [x] 5.1 Adicionar `DEFAULT_TENANT_SLUG` (default `"interna"`) à documentação de env (`.env.example`, `README`/`ARCHITECTURE` se aplicável) e ao `config.yaml` se houver validação — verificar que a var é lida no middleware e no seed
- [x] 5.2 No `src/db/seed.js`, criar de forma idempotente o tenant do `DEFAULT_TENANT_SLUG` (se não existir, cria; se existir, mantém) — verificar que rodar `npm run seed` 2x não duplica o tenant

## 6. Validação integrada

- [x] 6.1 Rodar `node --check` em todos os arquivos criados/editados (`tenant.js`, `Tenant.js`, `app.js`, `routes/index.js`, `routes/tenants.js`, `db/seed.js`) — verificar que todos passam
- [x] 6.2 Subir o backend e confirmar que `req.tenantId` está disponível (ex.: log/debug em uma rota `/api`) — verificar comportamento preservado sem header e com `X-Tenant-Slug` presente
- [x] 6.3 Rodar `npm run test:integration` com Mongo real — verificar que não há regressão nas rotas atuais
