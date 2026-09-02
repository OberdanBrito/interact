## Why

A fundação multi-tenant (MT-19…MT-23) já isola leitura e escrita por tenant, mas o **scheduler (I-01)**, o **canal SSE (I-07)** e os **dados legados** ainda não são escopados por tenant: comunicados agendados/expirados são liberados e emitidos **globalmente**, o SSE transmite eventos de **todos os tenants a qualquer cliente**, e documentos antigos têm `tenantId: null` (a ponte de transição). Em produção com 2+ tenants isso causaria vazamento de eventos, leitura cruzada de dados legados e liberação/expiração indevida de comunicados de outra instância. Agora que o backfill é possível, fecha-se a dívida: escopar scheduler/SSE e **remover a ponte** (`tenantScopeCondition`/`inTenantScope` estritos).

## What Changes

- **Scheduler per tenant** — `reconcile()` e `startExpiredSweep()` (src/scheduler.js) passam a iterar por tenant e a buscar pendentes/vencidos com filtro de `tenantId`; a liberação/expiração de agendados fica escopada ao tenant.
- **SSE escopado** — o payload emitido passa a incluir `tenantId`; cada conexão `GET /api/events` resolve o tenant (token/subdomínio) e **só repassa eventos do seu tenant**; eventos de outro tenant são descartados para aquele cliente.
- **Backfill/migração** — novo script (`scripts/migrate-mt24.mjs`) que cria o **tenant default** e associa todos os dados existentes (`User`/`Group`/`Comunicado`/`Interaction`/`Category`) a ele, **sem perda**.
- **BREAKING: escopo estrito** — `tenantScopeCondition`/`inTenantScope` deixam de casar `tenantId: null`: a leitura/escrita de posts, grupos, interações e categorias passa a exigir `tenantId === req.tenantId`. Dados legados (`null`) deixam de ser visíveis/elegíveis (só depois do backfill).
- **Seed** — confirma que `npm run seed` cria o tenant default e escopa os inserts (já atendido em MT-19/MT-23; validado, sem mudança de contrato).
- **QA** — novo `scripts/qa-mt24.mjs`; ajuste da `qa-mt22` (o post legado `null` passa de "visível" para "**invisível**" — valida o escopo estrito).

## Capabilities

### New Capabilities
<!-- Nenhuma: tudo entra nas capabilities existentes. -->
(nenhuma)

### Modified Capabilities
- `multi-tenant`: mudança de requisito (entidades com `tenantId` sem ponte `null`, pós-backfill) e novos requisitos (scheduler per tenant, migração para tenant default).
- `tempo-real`: mudança do requisito de payload (inclui `tenantId`) e novo requisito (cliente SSE só recebe eventos do seu tenant).

## Impact

- **Backend** (`src/`): `scheduler.js` (reconcile/sweep per tenant), `events.js`/`routes/events.js` (payload com `tenantId` + filtro por conexão), `utils/tenant.js` (escopo estrito), `routes/posts.js`/`groups.js`/`interactions.js`/`categories.js` (usam o escopo estrito), `db/seed.js` (validado), `models/Tenant.js` (usado na migração).
- **Scripts/QA**: `scripts/migrate-mt24.mjs` (novo), `scripts/qa-mt24.mjs` (novo), `scripts/qa-mt22.mjs` (ajuste do cenário legado), `package.json` (`db:migrate`, `qa:mt24`, `test:integration`).
- **API**: contrato do canal SSE (`GET /api/events`) passa a ser filtrado por tenant (payload + filtro por conexão). Sem mudança de esquema de dados; `tenantId` deixa de aceitar `null` em leitura/escrita.
- **Sem impacto** nos frontends (não alteram o fluxo; payloads continuam compatíveis).
