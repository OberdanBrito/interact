## Context

A MT-22 já escopou `/api/posts` com helpers locais a `src/routes/posts.js` (`tenantScopeCondition`,
`inTenantScope`) e mantém a ponte `$or: [{tenantId}, {tenantId: null}]` para dados legados (removida
na MT-24). Grupos, interações e categorias ainda não são escopados: `Group.find()` sem filtro,
`Interaction.find()`/`find({})` agregando tudo, categorias como array global hard-coded. Os models
`Group` e `Interaction` já têm `tenantId` (ObjectId, default `null`) com índices compostos prontos;
não existe model `Category` nem espec de grupos/categorias (a spec `interactions` existe e será
apenas acrescida de requisitos de escopo, sem mudar os 4 requisitos atuais).

## Goals / Non-Goals

**Goals:**
- Escopar grupos (listar/criar/editar/recipient-count) por tenant, com nome único por tenant.
- Escopar interações e métricas (`/me`, `/members`, `/summary`, `GET /`, `GET /:postId` e
  `isEligible`) por tenant.
- Transformar categorias em coleção tenant-scoped (`GET /api/categories` por tenant), com seed por
  tenant.
- Reutilizar os helpers de escopo da MT-22 via módulo compartilhado (DRY), sem mudar o
  comportamento testado dos posts.

**Non-Goals:**
- Não alterar o formato dos demais endpoints (só o escopo) — o contrato de grupos/interações
  permanece em forma.
- Não remover a ponte `tenantId: null` (isso é a MT-24/backfill).
- Não adaptar os frontends (admin/PWA) — isso é MT-25 e MT-26. A mudança em `/api/categories`
  (drop do "todas") terá contraparte nos frontends posteriormente.
- Não mudar a semântica de `Comunicado.categoryId` (continua sendo um slug string).

## Decisions

### D1 — Extrair helpers de escopo para módulo compartilhado `src/utils/tenant.js`
Os helpers genéricos `tenantScopeCondition(tenantId)` e `inTenantScope(doc, tenantId)` saem de
`src/routes/posts.js` (onde ficaram inline na MT-22) para `src/utils/tenant.js`. `posts.js` passa a
importá-los (mudança mínima, comportamento idêntico). Grupos, interações e categorias importam do
mesmo módulo. **Alternativa considerada:** duplicar os helpers por rota — rejeitada por quebrar DRY e
aumentar o risco de divergência entre as rotas.

- `tenantScopeCondition(tenantId)` mantém a normalização para `ObjectId` (essencial para a janela
  `smart`/`aggregate` dos posts; inofensiva para `find()`, que já faz cast), e retorna
  `{ $or: [{ tenantId: tid }, { tenantId: null }] }` (ponte legado).
- `inTenantScope(doc, tenantId)` retorna `doc.tenantId == null || String(doc.tenantId) === String(tenantId)`.

### D2 — Escopo em `groups.js`
- `GET /`: `Group.find(tenantScopeCondition(req.tenantId)).sort({ name: 1 })`.
- `POST /`: checagem de duplicata `Group.findOne({ name: trimmed, $and: [tenantScopeCondition(req.tenantId)] })`;
  persistir `tenantId: req.tenantId || null`.
- `PUT /:id`: carregar doc + `inTenantScope(doc, req.tenantId)` → `404` se cross-tenant; duplicata
  de nome com `$and: [tenantScopeCondition]`; aplicar update.
- `POST /recipient-count`: `User.countDocuments({ role: "colaborador", $and: [tenantScopeCondition] })`
  (broadcast) e `User.countDocuments({ groupIds: { $in: targetGroups }, $and: [tenantScopeCondition] })`
  (direcionado).
- O índice único `{ name, tenantId }` (já no model) é a garantia de banco; a checagem amigável na
  rota dá o 400 com mensagem clara. **Alternativa:** depender só do E11000 — rejeitada (mensagem de
  erro pior e fluxo mais frágil).

### D3 — Categorias: coleção tenant-scoped keyed por slug
- Novo model `src/models/Category.js`: `{ slug: String required, label: String required, tenantId:
  ObjectId ref Tenant default null }`, índices `{ slug: 1, tenantId: 1 }` (unique) e `{ tenantId: 1 }`.
- `GET /api/categories`: `Category.find(tenantScopeCondition(req.tenantId)).sort({ slug: 1 }).lean()`
  → mapeia para `{ id: slug, label }`.
- Seed por tenant: cria `geral`, `rh`, `ti`, `beneficios` vinculadas ao tenant default.
- **`id` = `slug`**: mantém o vínculo `Comunicado.categoryId` (que é o slug) → os frontends seguem
  mapeando `id` → `label`. **Alternativa considerada:** `id` = `_id` (ObjectId) — rejeitada porque
  quebraria `Comunicado.categoryId`, exigiria migração/backfill de posts e mudança nos frontends,
  tudo fora do escopo da MT-23.
- **"todas" não é categoria**: é um pseudo-filtro client-side. O `GET /api/categories` deixa de
  retornar "todas" (que hoje é hard-coded global); os frontends (MT-25/26) passam a derivar o chip
  "Todas" no cliente. Registrado como trade-off (ver Risks).

### D4 — Escopo em `interactions.js`
- `PUT /:postId`: `isEligible(req.user, postId)` ganha pré-condição de tenant (cross-tenant →
  false); upsert com `$setOnInsert: { postId, userId, tenantId: req.tenantId || null }`.
- `isEligible(user, postId)`: após buscar o comunicado, adicionar
  `const postTenant = doc.tenantId ? String(doc.tenantId) : null; const userTenant =
  user.tenantId ? String(user.tenantId) : null; if (postTenant !== null && postTenant !== userTenant)
  return false;`.
- Leituras (todas `find()`, sem `aggregate` → sem necessidade de cast adicional):
  - `GET /me`: `Interaction.find({ userId: req.user.id, $and: [tenantScopeCondition(req.tenantId)] })`.
  - `GET /members`: `Interaction.find({ postId, $and: [tenantScopeCondition(req.tenantId)] })`;
    `Group.find(tenantScopeCondition(req.tenantId)).select("name").lean()`.
  - `GET /summary`: `Interaction.find(tenantScopeCondition(req.tenantId)).lean()` como base da
    agregação (mantendo os filtros desde/ate/groupId do I-13).
  - `GET /`: `Interaction.find({ postId, $and: [tenantScopeCondition(req.tenantId)] })`;
    `Group.find(tenantScopeCondition(req.tenantId)).select("name").lean()`.
  - `GET /:postId`: admin → `Interaction.find({ postId, $and: [tenantScopeCondition] })`;
    colaborador → `Interaction.findOne({ postId, userId, $and: [tenantScopeCondition] })`.

### D5 — Seed por tenant (transição)
`src/db/seed.js` passa a gravar `tenantId: defaultTenant._id` no admin, grupos, colaboradores e
comunicados (hoje tudo `null` = legado) e a criar as categorias default do tenant. Assim o tenant
default ("interna") fica autossuficiente no novo escopo, e a ponte `null` não é necessária para o
dev/QA do tenant padrão (mas permanece para dados realmente legados).

### D6 — QA de integração `scripts/qa-mt23.mjs`
Segue o padrão do `qa-mt22.mjs` (tenants A/B via `X-Tenant-Slug`): cria dois tenants, semeia
dados de grupos/interações/categorias em cada um e valida isolamento cross-tenant (404 em
mutações de outro tenant, listagens/agregados sem vazamento, nome de grupo único por tenant,
categorias por tenant). Adicionado ao `test:integration`.

## Risks / Trade-offs

- **`GET /api/categories` deixa de retornar "todas"** (chip-Todas) → até as MT-25/MT-26
  adaptarem os frontends, o chip "Todas" pode sumir. **Mitigação:** é um pseudo-filtro client-side;
  os frontends derivam "Todas" localmente; a mudança é isolada na API e não quebra os comunicados
  (que nunca usam `categoryId: "todas"`).
- **Interação legada `tenantId: null`** permanece na ponte (contada para qualquer tenant que resolva
  default) → pequeno risco de métrica "vazada" entre tenants até a MT-24. **Mitigação:** mesmo
  comportamento já adotado na MT-22 (posts) e na MT-21 (auth); o backfill da MT-24 remove a ponte.
- **Extrair helpers de posts.js introduz mudança em código testado** → risco de regressão baixo, mas
  existente. **Mitigação:** helpers são funções puras; `test:integration` (9 scripts, inclui
  `qa-mt22`) valida que o comportamento dos posts não muda.
- **Tipo de `id` de categoria** (slug vs ObjectId) é uma decisão de contrato → se um dia houver
  categorias customizadas com slug arbitrário, o vínculo `categoryId` continua funcionando; se for
  preciso re-identificar por `_id`, seria uma mudança (MT futura). **Trade-off aceito** em favor da
  compatibilidade.

## Migration Plan

1. Implementar `Category` model + `src/utils/tenant.js` + refatorar `posts.js` (só import).
2. Escopar `groups.js`, `interactions.js`, `categories.js`.
3. Ajustar `seed.js` (tenantId + categorias default).
4. Adicionar `scripts/qa-mt23.mjs` e incluir no `test:integration`.
5. Rodar `node --check` + `npm run test:integration` (Mongo real via docker) + `openspec validate`.
6. **Rollback:** reverter o commit da MT-23; a ponte `null` + modelos com `tenantId` são
   retrocompatíveis (nenhuma migração destrutiva de schema introduzida).

## Open Questions

Nenhuma. A decisão de categorias (coleção keyed por slug, "todas" como pseudo-filtro client-side) foi
definida com base nos critérios de aceite da issue #23 ("coleção + seed por tenant") e no acoplamento
existente `Comunicado.categoryId` (slug). Os frontends serão tratados nas MT-25/MT-26.
