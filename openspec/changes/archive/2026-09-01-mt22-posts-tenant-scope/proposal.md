## Why

MT-20 adicionou `tenantId` aos models, mas as queries de `/api/posts` ainda não filtram pelo
tenant resolvido — um comunicado de uma instância pode ser lido por outra. Além disso, os IDs
são gerados por uma **sequência global** (`p01/p02`), o que **colide entre tenants** (dois tenants
independentes podem gerar o mesmo `p01`). MT-22 escopa `/api/posts` por tenant (listagem, detalhe,
create, update, delete e anexos), torna o tenant uma pré-condição de elegibilidade e migra a
geração de IDs para **UUID** (D4), removendo a colisão entre instâncias.

## What Changes

- `GET /api/posts` (admin e colaborador): passa a listar apenas comunicados do tenant resolvido
  (`req.tenantId`), preservando a ordenação inteligente, arquivo, categoria, busca e paginação
  já existentes.
- `GET /api/posts/:id`: comunicado de **outro tenant** → **404** (não 403), via `isPostEligible`.
- `POST /api/posts`: grava `tenantId = req.tenantId` (ou null, se nenhum tenant for resolvido) no
  novo comunicado.
- `PUT /api/posts/:id` e `DELETE /api/posts/:id`: operam apenas dentro do tenant do autor.
- Rotas de anexos (`POST`/`GET`/`DELETE /:id/attachments`): respeitam o escopo do tenant do
  comunicado.
- `isPostEligible`: adiciona o `tenantId` do documento como pré-condição de elegibilidade.
- **IDs (D4)**: a geração de comunicado migra da sequência global `pNN` para **UUID**
  (`crypto.randomUUID()`), evitando colisão entre tenants. **BREAKING**: qualquer código/QA que
  assumisse o formato literal `pNN` deixa de ser gerado para novos comunicados.
- Novo QA de integração `scripts/qa-mt22.mjs` (tenants A/B) + inclusão no `test:integration`.

## Capabilities

### New Capabilities

- Nenhuma.

### Modified Capabilities

- `comunicados`: escopo por tenant em todas as operações de `/api/posts` (listagem, detalhe,
  criação, edição, exclusão e anexos); `isPostEligible` considera o tenant do documento; IDs de
  comunicado gerados como UUID (D4).

## Impact

- `backend/src/routes/posts.js` — todas as queries ganham filtro por tenant; `isPostEligible`
  passa a checar `tenantId`; geração de ID migra para UUID.
- `backend/src/models/Comunicado.js` — atualizar comentário do formato de `_id`; o tipo continua
  `String` (UUID é string), sem migração de schema.
- `backend/scripts/qa-mt22.mjs` (novo) e `backend/package.json` (`test:integration`).
- Consumidores: os frontends continuam consumindo `id` como string (UUID é string) — sem mudança
  de contrato; scheduler e interações usam `_id` como string — OK.
