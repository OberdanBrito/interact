## 1. Preparação e contexto

- [x] 1.1 Subir o ambiente de QA (Mongo via docker compose + seed + backend em :3002) e verificar que `GET /api/posts` devolve os comunicados semeados — valida a ponte `tenantId: null` antes de tocar no código
- [x] 1.2 Ler `src/middleware/auth.js` e confirmar que `req.user.tenantId` é populado a partir da claim do JWT (pré-requisito do `isPostEligible`)

## 2. Escopo por tenant na listagem e no detalhe

- [x] 2.1 Em `src/routes/posts.js` (`GET /`), compor a condição de tenant (D1: `$or: [{tenantId: req.tenantId}, {tenantId: null}]` quando `req.tenantId`; senão `{tenantId: null}`) e adicioná-la ao `$and`/`filter` — verificar `node --check src/routes/posts.js`
- [x] 2.2 Em `isPostEligible`, adicionar a pré-condição de tenant (D2: `docTenant !== null && docTenant !== userTenant → false`) — verificar que `GET /:id` e `GET /:id/attachments/:attachmentId` de outro tenant retornam 404 e que post legado `null` continua elegível
- [x] 2.3 Validar manualmente (curl com `X-Tenant-Slug`) que `GET /api/posts` de um tenant não retorna posts de outro

## 3. Mutação escopada e IDs UUID

- [x] 3.1 Adicionar helper `inTenantScope(doc, tenantId)` (D3) e aplicá-lo a `PUT /:id`, `DELETE /:id`, `POST /:id/attachments` e `DELETE /:id/attachments/:attachmentId` — admin de outro tenant recebe 404 sem revelar existência — `node --check`
- [x] 3.2 Em `POST /api/posts`, remover a sequência global (`findOne().sort({_id:-1})` + `pNN`) e gerar `crypto.randomUUID()` (import `node:crypto`); atualizar o comentário de `_id` em `src/models/Comunicado.js` — verificar `node --check` e que o `id` do payload é UUID
- [x] 3.3 Confirmar que `POST /api/posts` persiste `tenantId: req.tenantId` no novo comunicado

## 4. QA de integração e regressão

- [x] 4.1 Criar `scripts/qa-mt22.mjs` cobrindo: (a) admin/colab de tenant A não vê posts de B; (b) `GET /:id` de post de B a partir de A → 404; (c) `POST` cria comunicado com `tenantId` do tenant e `id` UUID; (d) ponte: post legado `null` continua visível — rodar com assert e reportar contagem ok/falha
- [x] 4.2 Adicionar `node scripts/qa-mt22.mjs` ao `test:integration` em `package.json` (ao lado de qa-i21)
- [x] 4.3 Rodar `npm run test:integration` completo (Mongo real) e verificar 0 falhas, incluindo qa-i03/i04/i05/i10/i11/i12/i21 (sem regressão com a ponte)
- [x] 4.4 Rodar `node --check` em todos os arquivos alterados (`src/routes/posts.js`, `src/models/Comunicado.js`, `scripts/qa-mt22.mjs`)
