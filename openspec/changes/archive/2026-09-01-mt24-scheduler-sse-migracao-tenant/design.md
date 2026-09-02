## Context

Ver proposal.md - Why. Estado atual (fonte: código em `src/`):
- `tenantScopeCondition(tenantId)` retorna `$or: [{tenantId}, {tenantId:null}]` (ponte legada) usado em posts/groups/interactions/categories; `inTenantScope` aceita `doc.tenantId == null`. Ambas vivem em `src/utils/tenant.js`.
- `scheduler.js`: `reconcile()` e `startExpiredSweep()` varrem **todos** os comunicados (sem filtro de tenant); `release(id)` emite `post:new` global; `post:expired` emite `{ id }`.
- `events.js`/`routes/events.js`: `emitSafe(event, payload)` emite no emitter + sinal `__stream__`; o SSE repassa **qualquer** evento a **toda** conexão (`onStream` incondicional). `GET /api/events` roda sob o `resolveTenantMiddleware` global (com `req.tenantId`) + `auth`.
- `toPost(doc)` (posts.js) não expõe `tenantId` no payload.
- `db/seed.js` já cria o tenant default (idempotente) e grava `tenantId` nos inserts — o requisito de seed da MT-24 está **satisfeito** (validado, sem mudança de contrato).

## Goals / Non-Goals

**Goals:**
- Escopar scheduler (`reconcile`/sweep) e SSE por tenant (payload com `tenantId` + filtro por conexão).
- Remover a ponte `tenantId: null` (escopo estrito) com script de migração/backfill para o tenant default.
- Não alterar o contrato dos endpoints REST existentes além do payload SSE (que só ganha um campo) e da indisponibilidade de dados legados `null` pós-strict.

**Non-Goals:**
- Não mexer nos frontends (payloads continuam compatíveis).
- Não implementar a I-14 (SSE de `interaction:changed`) — apenas garantimos que o canal genérico continua filtrado por tenant para quando ela chegar.
- Não mudar o schema dos models (o campo `tenantId` continua existindo; só a leitura/escrita passa a ser estrita).

## Decisions

**D1 — `toPost(doc)` expõe `tenantId` (string).** Adicionar `tenantId: String(doc.tenantId)` ao payload de `post:new`/`post:updated`. Para `post:expired`, mudar o payload de `{ id }` para `{ id, tenantId }` (derivado de `doc.tenantId`). Alternativa considerada: ler o tenant no momento da emissão via `resolveTenant(req)` — descartada porque o scheduler emite sem `req` (contexto de background); o tenant vem do documento.

**D2 — Filtro SSE por conexão.** Em `routes/events.js::openStream`, capturar `req.tenantId` no início da conexão e, no `onStream`, se `payload.tenantId` está presente e `String(payload.tenantId) !== String(req.tenantId)`, **descartar** o evento (não escrever no stream). O tenant da conexão vem do `resolveTenantMiddleware` global (header → subdomínio → claim JWT; o SS£ é autenticado por token com `tenantId`). Eventos sem `payload.tenantId` são descartados (estrito) para evitar vazamento — os eventos de post (D1) sempre carregam `tenantId`. Alternativa considerada: filtrar por `emitter` por tenant (múltiplos emitters) — descartada por maior complexidade e por não cobrir reconexão; o payload+conexão resolve de forma simples.

**D3 — Scheduler itera por tenant.** `reconcile()` passa a listar tenants ativos (`Tenant.find({ active: true })`) e, para cada um, processar pendentes `{ tenantId, published:false, publishAt }`. `release(id, tenantId)` inclui `tenantId` no filtro do `findOneAndUpdate` (`{ _id, published:false, tenantId }`) — defensivo (só libera o que é do tenant). `startExpiredSweep()` escopa a query com `tenantScopeCondition`/`tenantId`. O tick global (publish-tick) e o `setInterval` do sweep seguem como drivers, delegando ao processamento per-tenant. **Ordem exigida:** a migração (D4) ou o seed devem rodar **antes** de ativar o scheduler estrito em um ambiente com dados legados `null` (senão agendados legados não seriam liberados); em dev o `db:reset`/seed garante `tenantId`.

**D4 — Script de migração/backfill.** `scripts/migrate-mt24.mjs`: conecta ao Mongo, garante o tenant default (cria se ausente, `DEFAULT_TENANT_SLUG || "interna"`), e para `User`, `Group`, `Comunicado`, `Interaction`, `Category` roda `updateMany({ $or: [{ tenantId: null }, { tenantId: { $exists: false } }] }, { $set: { tenantId: default._id } })`, logando contagem por coleção. Idempotente (re-executável). Npm script `db:migrate`. Alternativa: incluir o backfill no seed — descartada (o seed faz reset total; a migração deve preservar dados em ambientes existentes).

**D5 — Escopo estrito (remoção da ponte).** `tenantScopeCondition(tenantId)` passa a `{ tenantId: tid }` (sem `$or` com `null`); `inTenantScope(doc, tenantId)` passa a `String(doc.tenantId) === String(tenantId)`. Afeta leituras/escritas de posts/groups/interactions/categories (todos dependem dos helpers). **Ajuste de QA:** `qa-mt22` assere hoje "admin A vê legado null (ponte)"; passa a asserir "admin A NÃO vê legado null (estrito)". `qa-mt23` não depende da ponte (sempre cria `tenantId`), permanece.

## Risks / Trade-offs

- [Remoção da ponte esconde dados legados `null`] → A migração (D4) roda antes de ativar o escopo estrito; o `qa-mt22` é ajustado para o comportamento novo. Em produção, deploy deve ser acompanhado do `db:migrate`.
- [Scheduler estrito não libera agendados legados `null`] → Rodar a migração (ou `db:reset`/seed) antes; documentar a ordem no script/README.
- [SSE descarta eventos sem `tenantId`] → Todos os eventos de post carregam `tenantId` (D1); a I-14, ao incluir `interaction:changed`, deverá incluir `tenantId` no payload (documentado como ponto de atenção).
- [Payload SSE ganha um campo] → Retrocompatível (clientes ignoram campos extras). Sem quebra de contrato.

## Migration Plan

1. Deploy do código (escopo estrito + scheduler/SSE scoped) **acompanhado** da migração: rodar `npm run db:migrate` (cria/garante tenant default e backfilla `null` → default) para que nenhum dado legado fique invisível.
2. Alternativa para dev: `npm run db:reset` (nova coleção já com `tenantId`).
3. **Rollback:** reverter o commit; a ponte `null` volta nas condições de escopo; os dados já migrados (com `tenantId` setado) permanecem íntegros e bem-scoped — sem perda.
4. Validação: `npm run test:integration` (com `qa-mt24` + `qa-mt22` ajustado) + `node --check` nos arquivos alterados.

## Open Questions

Nenhuma bloqueante. Ponto de atenção futuro: a I-14 (SSE `interaction:changed`) deverá emitir payload com `tenantId` para não ser filtrada indevidamente pelo D2.
