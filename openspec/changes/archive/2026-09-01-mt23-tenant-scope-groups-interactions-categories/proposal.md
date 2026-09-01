## Why

A fundação multi-tenant já escopou autenticação (MT-21) e comunicados (MT-22), mas **grupos,
interações e categorias ainda vazam entre tenants**: `GET /api/groups` lista grupos de todos os
tenants, interações/membros/summary agregam dados de todas as instâncias e categorias são uma
lista global hard-coded. Para o SaaS ficar viável, cada endpoint de leitura/escrita e cada
agregado de métricas precisa enxergar somente o próprio tenant, sem expor dados de outras
instâncias.

## What Changes

- **`groups.js`**: todas as consultas (listar `GET /`, criar `POST /`, editar `PUT /:id`,
  `recipient-count`) passam a filtrar/persistir por `tenantId`; nomes de grupo são únicos **por
  tenant** (duplicata checada dentro do tenant; o índice composto `{name, tenantId}` já garante
  no banco). Mutações não pertencentes ao tenant retornam `404` (sem revelar existência).
- **`interactions.js`**: o upsert (`PUT /:postId`) passa a gravar `tenantId`; todas as leituras
  (`/me`, `/members`, `/summary`, `GET /`, `GET /:postId`) são escopadas por tenant; `isEligible`
  ganha pré-condição de tenant (cross-tenant → não-elegível); `Group.find()` usado para mapear
  nomes é filtrado por tenant.
- **`categorias.js`**: de estáticas/globais para uma **coleção tenant-scoped** (novo model
  `Category` com `slug` único por tenant + `label`), com seed por tenant e `GET /api/categories`
  retornando as categorias do tenant.
- **Helpers compartilhados**: os helpers de escopo criados na MT-22 em `posts.js`
  (`tenantScopeCondition`, `inTenantScope`) são extraídos para um módulo compartilhado
  (`src/utils/tenant.js`) e reutilizados por posts/groups/interactions/categories (DRY), sem mudar
  o comportamento testado dos posts.
- **`db/seed.js`**: passa a gravar `tenantId` (tenant default) em `User`, `Group`, `Comunicado` e a
  criar as categorias default por tenant.
- **QA**: novo `scripts/qa-mt23.mjs` (tenants A/B) cobrindo isolamento cross-tenant em grupos,
  interações e categorias, adicionado ao `test:integration`.

## Capabilities

### New Capabilities
- `grupos`: escopo por tenant em grupos (listar/criar/editar + recipient-count) e nome único por
  tenant.
- `categorias`: coleção de categorias tenant-scoped (model `Category` + `GET /api/categories` por
  tenant).

### Modified Capabilities
- `interactions`: adiciona o requisito de escopo por tenant (upsert grava `tenantId`, leituras
  `/me`/`/members`/`/summary`/`GET /`/`GET /:postId` e `isEligible` filtram por tenant).

## Impact

- **Backend** (`src/routes/groups.js`, `src/routes/interactions.js`, `src/routes/categories.js`,
  `src/routes/posts.js` — só para usar o helper extraído —, `src/models/Category.js` novo,
  `src/utils/tenant.js` novo, `src/db/seed.js`, `scripts/qa-mt23.mjs`, `package.json`).
- **Contrato de API**: `GET /api/categories` deixa de retornar a lista global hard-coded e passa a
  retornar as categorias do tenant (o chip "todas" é filtro client-side, não é uma categoria). Os
  frontends serão adaptados nas MT-25 (admin) / MT-26 (PWA); o contrato dos demais endpoints não
  muda em forma, apenas em escopo.
- **Compatibilidade/transição**: mantida a ponte `tenantId: null` (dados legados continuam
  visíveis), a ser removida no backfill da MT-24.
