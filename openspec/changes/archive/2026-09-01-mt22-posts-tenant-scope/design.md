## Context

A MT-20 adicionou `tenantId` (ref `Tenant`, default `null`) ao model `Comunicado` e os índices
compostos `{ tenantId, published, dateISO }` e `{ tenantId, createdBy, dateISO }`. A MT-21 já
escopou o login e validou pertencimento no `auth.js` (403). Resta **escopar as operações de
`/api/posts`** pelo tenant resolvido e **migrar a geração de IDs** para UUID. Veja `proposal.md` —
Why para a motivação.

Estado atual relevante:
- `req.tenantId` (string) e `req.tenant` (doc) são resolvidos por `resolveTenantMiddleware`, com
  fallback de dev para o tenant default (`interna`) em não-produção ou `null`.
- `auth.js` garante, para rotas autenticadas, que `req.user.tenantId === req.tenantId`
  (403 caso contrário), então `user.tenantId` é consistente com o tenant da requisição.
- `Comunicado._id` é `String` (hoje `p01/p02`). O payload expõe `id` como string; scheduler,
  interações e anexos usam `_id` como string.
- `isPostEligible(doc, user)` hoje não considera `tenantId`.

## Goals / Non-Goals

**Goals:**
- Escopar por tenant listagem, detalhe, criação, edição, exclusão e anexos de `/api/posts`.
- `isPostEligible` passa a exigir o tenant do documento (pré-condição).
- Gerar IDs de novos comunicados como UUID (D4), sem colisão entre tenants.
- Preservar o comportamento atual de dev/QA (posts legados `tenantId: null`) durante a transição.

**Non-Goals:**
- Não escopar `Interaction`/`Group`/categorias (MT-23) — apenas `Comunicado` e a rota `/api/posts`.
- Não fazer o backfill dos dados legados (MT-24), nem remover o bridge de `null`.
- Não alterar o contrato do payload (`id` continua string) nem a API consumida pelos frontends.
- Não mudar schema/índices (já existentes desde a MT-20).

## Decisions

### D1 — Filtro de tenant com ponte para legado `null`

Todas as queries de `/api/posts` passam a compor uma condição de tenant no `filter`:
```js
const tenantScope = req.tenantId
  ? { $or: [{ tenantId: req.tenantId }, { tenantId: null }] }
  : { tenantId: null };
and.push(tenantScope); // compõe sob `filter.$and`, usado por find() e aggregate($match)
```
- `req.tenantId` definido → casa o tenant **ou** legado `null` (ponte de transição, equivalente à
  usada no login da MT-21).
- `req.tenantId` nulo → casa somente `null`.
- **Normalização para ObjectId:** `req.tenantId` chega como string; como o mesmo filtro é usado
  tanto em `find()` quanto no `$match` do `aggregate` (janela `smart` do colaborador), a condição é
  montada com `new mongoose.Types.ObjectId(tenantId)` quando válido — o `aggregate` NÃO faz cast
  automático de string → ObjectId, e sem isso o comunicado do tenant próprio não seria casado no feed.
- **Isolamento:** posts com `tenantId` de outro tenant **nunca** são casados (o `$or` só cobre o
  próprio tenant + `null`), então cross-tenant continua isolado.
- **Alternativa descartada:** filtrar só por `req.tenantId` exato quebraria a dev/QA (posts semeados
  com `tenantId: null` sumiriam do feed) até o backfill da MT-24.

### D2 — `isPostEligible` com pré-condição de tenant (ponte inclusiva)

Assinatura mantida `(doc, user)`. Nova pré-condição (bloqueio) após as regras existentes:
```js
const docTenant = doc.tenantId ? String(doc.tenantId) : null;
const userTenant = user.tenantId ? String(user.tenantId) : null;
if (docTenant !== null && docTenant !== userTenant) return false; // outro tenant → 404
```
- `docTenant === userTenant` (mesmo tenant, inclusive ambos `null`) → elegível.
- `docTenant === null` (legado) → elegível (ponte de transição), mantém dev/QA.
- `docTenant !== userTenant` e `docTenant !== null` → **não elegível → 404** (aceite da issue).
- `user.tenantId` vem da claim do JWT, que já é validado contra `req.tenantId` no `auth.js`.

### D3 — Rotas de mutação com escopo explícito de tenant

`GET /:id` e `GET /:id/attachments/:attachmentId` já dependem de `isPostEligible` (→ 404). As rotas
de mutação admin (`PUT /:id`, `DELETE /:id`, `POST /:id/attachments`, `DELETE /:id/attachments/:attachmentId`)
NÃO usam `isPostEligible`, então ganham um check de escopo baseado no **tenant autor (owner)**:
```js
function inTenantScope(doc, tenantId) {
  return doc.tenantId == null || String(doc.tenantId) === String(tenantId);
}
// após findById: if (!doc || !inTenantScope(doc, req.tenantId)) return 404;
```
- Admin só consegue editar/excluir/anexar dentro do tenant do autor (ou legado `null`).
- Comunicado de outro tenant → 404, sem revelar existência.

### D4 — IDs de comunicado como UUID (node:crypto)

Remover o bloco de sequência global (`findOne().sort({_id:-1})` + `p${n}`) do `POST` e gerar
`crypto.randomUUID()`:
```js
import crypto from "node:crypto";
// ...
const newId = crypto.randomUUID();
```
- `_id` continua `String` (UUID é string) — **sem** migração de schema.
- IDs históricos (`pNN`) continuam válidos; apenas novos passam a ser UUID (sem colisão entre tenants).
- `node:crypto.randomUUID()` disponível (Node ≥ 14.17; validação usa Node v25).
- **Nota:** `src/data.js` (hard-codes `p01…p08`) e `scripts/qa-pwa.mjs` são código morto do
  frontend_pwa commitado na branch backend (ver AGENTS.md) — não fazem parte do `test:integration`;
  não os ajustar.

## Risks / Trade-offs

- **[Cross-tenant isolation parcial durante a transição]** a ponte `null` faz posts legados
  aparecerem para todos os tenants que resolvem um tenant → Mitigação: é comportamento intencional
  até o backfill (MT-24); posts com `tenantId` definido permanecem isolados. Documentado como
  behavior de transição.
- **[QA de integração pode quebrar]** scripts existentes criam posts sem tenantId → Mitigação: a
  ponte mantém esses posts visíveis; o novo `scripts/qa-mt22.mjs` cobre o cenário A/B e é entrada no
  `test:integration`.
- **[Consumidor que assumia `pNN`]** qualquer código novo que dependesse do formato quebra ao receber
  UUID → Mitigação: `id` continua string; frontends tratam `id` opaco. Código morto com `pNN` não é
  usado.
- **[`readIds` não escopado]** o `Interaction.find({userId, read:true})` na janela `smart` não filtra
  por tenant → Mitigação: os `readIds` extras de outros tenants simplesmente não casam nos posts
  do tenant filtrado; o escopo de `Interaction` é da MT-23 (non-goal).

## Migration Plan

1. Aplicar as mudanças em `src/routes/posts.js` (D1–D4) e o comentário do model (D4).
2. Adicionar `scripts/qa-mt22.mjs` e incluí-lo no `test:integration` (`package.json`).
3. Rodar `npm run test:integration` (Mongo real) — garantir que scripts existentes (qa-i03/i04/i05/
   i10/i11/i12/i21) seguem verdes com a ponte.
4. `node --check` nos arquivos alterados.
5. Rollback: reverter o commit (mudanças contidas em `src/routes/posts.js` + scripts + package.json).
