## 1. Escopo estrito (remoção da ponte)

- [x] 1.1 Em `src/utils/tenant.js`: `tenantScopeCondition(tenantId)` retorna `{ tenantId: tid }` (sem `$or` com `null`) e `inTenantScope(doc, tenantId)` passa a `String(doc.tenantId) === String(tenantId)` — verificar com `node --check src/utils/tenant.js`.
- [x] 1.2 Reexecutar `npm run test:integration` e confirmar que `qa-mt23` (sempre cria `tenantId`) continua verde com o escopo estrito.

## 2. Payload SSE com tenantId

- [x] 2.1 Em `src/routes/posts.js::toPost`, expor `tenantId: String(doc.tenantId)` no payload — verificar que `post:new`/`post:updated` passam a incluir `tenantId`.
- [x] 2.2 Em `src/scheduler.js::startExpiredSweep`, mudar o payload de `post:expired` de `{ id }` para `{ id, tenantId: String(doc.tenantId) }` — verificar com `node --check`.

## 3. Filtro SSE por tenant

- [x] 3.1 Em `src/routes/events.js::openStream`, capturar `req.user.tenantId` e filtrar no `onStream`: se `payload.tenantId` estiver presente e `String(payload.tenantId) !== String(req.user.tenantId)`, descartar (não escrever); eventos sem `payload.tenantId` são descartados — verificar com `node --check`.
- [x] 3.2 Confirmar que `GET /api/events` continua autenticado e com `req.tenantId` resolvido (via claim do token) — verificar que uma conexão do tenant A NÃO recebe evento do tenant B e recebe os do tenant A (cobrir em qa-mt24).

## 4. Scheduler por tenant

- [x] 4.1 Em `src/scheduler.js::reconcile`, listar tenants ativos (`Tenant.find({ active: true })`) e processar pendentes por tenant (`{ tenantId, published:false, publishAt }`); escopar `release(id, tenantId)` com `tenantId` no filtro do `findOneAndUpdate` — verificar com `node --check`.
- [x] 4.2 Em `src/scheduler.js::startExpiredSweep`, escopar a query de expirados por tenant (via `tenantId`) — verificar com `node --check`.
- [x] 4.3 Confirmar que liberação/expiração só afeta comunicados do tenant (cobrir em qa-mt24).

## 5. Migração / backfill

- [x] 5.1 Criar `scripts/migrate-mt24.mjs`: conecta, garante tenant default (`DEFAULT_TENANT_SLUG || "interna"`, cria se ausente) e backfilla User/Group/Comunicado/Interaction/Category com `tenantId` null/ausente → default, logando contagem por coleção; idempotente — verificar contagens de execução.
- [x] 5.2 Adicionar script `db:migrate` (ex.: `node scripts/migrate-mt24.mjs`) em `package.json`; e rodar o script contra o Mongo de teste e validar que nenhum doc fica com `tenantId: null` — verificar saída do script.

## 6. QA e integração

- [x] 6.1 Ajustar `scripts/qa-mt22.mjs`: inverter a checagem do post legado `null` ("admin A vê legado null (ponte)" → "admin A NÃO vê legado null (estrito)") — verificar `qa-mt22` verde.
- [x] 6.2 Criar `scripts/qa-mt24.mjs` cobrindo: (a) scheduler publica/expira só do tenant, (b) SSE: cliente A não recebe evento de B e recebe de A, (c) escopo estrito (legado `null` invisível), (d) migração backfilla para o default — verificar `qa-mt24` verde (server de teste em porta própria: 4024).
- [x] 6.3 Adicionar `qa:mt24` e incluir `qa-mt24` no `test:integration` (`package.json`) — verificar `npm run test:integration` completo (11 scripts, EXIT 0). Ajuste adicional: `qa-i07` tornado tenant-aware (usuários/posts com `tenantId` + slug nas chamadas).
- [x] 6.4 Rodar `node --check` em todos os arquivos alterados — verificar sem erros.

## 7. Documentação

- [x] 7.1 Atualizar `AGENTS.md` (main) com a convenção MT-24 (scheduler/SSE per tenant, escopo estrito sem ponte `null`, script de migração/backfill) — verificar commit na main.
