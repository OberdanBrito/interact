## 1. Fundação (helpers compartilhados + model Category)

- [x] 1.1 Criar `src/utils/tenant.js` exportando `tenantScopeCondition(tenantId)` e `inTenantScope(doc, tenantId)` (movidos de posts.js, com normalização ObjectId). Verificar com `node --check src/utils/tenant.js`.
- [x] 1.2 Refatorar `src/routes/posts.js` para importar os helpers de `src/utils/tenant.js` (remover definições inline, manter comportamento idêntico). Verificar `node --check src/routes/posts.js` e que `qa-mt22.mjs` continua passando.
- [x] 1.3 Criar `src/models/Category.js` (`slug`, `label`, `tenantId` ref Tenant default null; índices `{slug:1,tenantId:1}` unique e `{tenantId:1}`). Verificar `node --check src/models/Category.js`.

## 2. Grupos

- [x] 2.1 `groups.js` GET `/`: filtrar por `tenantScopeCondition(req.tenantId)` na listagem. Verificar via `scripts/qa-mt23.mjs` (lista isolada por tenant).
- [x] 2.2 `groups.js` POST `/`: checagem de duplicata por tenant (`$and: [tenantScopeCondition]`) e persistir `tenantId: req.tenantId || null`. Verificar nome único por tenant (400 no mesmo tenant; permitido em tenant diferente).
- [x] 2.3 `groups.js` PUT `/:id`: carregar doc + `inTenantScope` (cross-tenant → 404) e duplicata de nome por tenant. Verificar 404 cross-tenant e renomear sem bloquear nome existente em outro tenant.
- [x] 2.4 `groups.js` POST `/recipient-count`: escopar `User.countDocuments` por tenant (broadcast + direcionado). Verificar contagem só do tenant.
- [x] 2.5 Verificar `node --check src/routes/groups.js`.

## 3. Interações

- [x] 3.1 `interactions.js` `isEligible`: adicionar pré-condição de tenant (cross-tenant → false). Verificar via `qa-mt23.mjs` (colaborador A não interage com post do tenant B).
- [x] 3.2 `interactions.js` PUT `/:postId`: incluir `tenantId: req.tenantId || null` no `$setOnInsert` do upsert. Verificar interação persistida com tenant.
- [x] 3.3 `interactions.js` GET `/me`: filtrar por tenant (`$and: [tenantScopeCondition]`). Verificar estado do usuário sem vazar.
- [x] 3.4 `interactions.js` GET `/members`: escopar `Interaction.find` e `Group.find` (nomes) por tenant. Verificar quem-leu só do tenant.
- [x] 3.5 `interactions.js` GET `/summary`: base da agregação `Interaction.find(tenantScopeCondition(req.tenantId))` (mantendo filtros desde/ate/groupId). Verificar summary isolado por tenant.
- [x] 3.6 `interactions.js` GET `/`: escopar `Interaction.find({postId,...})` e `Group.find` (nomes) por tenant. Verificar agregado por comunicado só do tenant.
- [x] 3.7 `interactions.js` GET `/:postId`: escopar por tenant (admin agrega do tenant; colaborador só o próprio doc do tenant). Verificar ambos os papéis.
- [x] 3.8 Verificar `node --check src/routes/interactions.js`.

## 4. Categorias

- [x] 4.1 `categories.js` GET `/`: retornar `Category.find(tenantScopeCondition(req.tenantId)).sort({slug:1}).lean()` mapeado para `{ id: slug, label }`. Verificar categorias por tenant (sem "todas").
- [x] 4.2 Confirmar que `src/routes/index.js` já monta `/api/categories` → `categoriesRouter` (sem alteração). Verificar rota ativa.
- [x] 4.3 Verificar `node --check src/routes/categories.js`.

## 5. Seed por tenant

- [x] 5.1 `db/seed.js`: atribuir `tenantId: defaultTenant._id` a admin, grupos, colaboradores e comunicados; criar categorias default (`geral`, `rh`, `ti`, `beneficios`) do tenant. Verificar `npm run seed` no Mongo real.

## 6. QA e validação

- [x] 6.1 Criar `scripts/qa-mt23.mjs` (tenants A/B via `X-Tenant-Slug`) cobrindo: isolamento de grupos, nome único por tenant, interações/membros/summary sem vazamento, `isEligible` cross-tenant, categorias por tenant. Rodar isolado → 0 falhas.
- [x] 6.2 `package.json`: adicionar `node scripts/qa-mt23.mjs` ao `test:integration`. Verificar script listado.
- [x] 6.3 Rodar `node --check` em todos os arquivos alterados (`src/utils/tenant.js`, `src/routes/*.js`, `src/models/Category.js`, `scripts/qa-mt23.mjs`) → sem erros.
- [x] 6.4 Rodar `npm run test:integration` (Mongo real via docker) → 9+ scripts, 0 falhas.
- [x] 6.5 Executar `openspec validate --changes` para a change MT-23 → passa.
