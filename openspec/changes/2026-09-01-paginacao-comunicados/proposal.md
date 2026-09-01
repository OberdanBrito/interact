## Why

O feed do colaborador carrega todos os comunicados de uma vez em `GET /api/posts`, o que não escala
com o volume de comunicados. Para suportar infinite scroll (I-10), a listagem precisa de paginação
por cursor, e a "ordenação inteligente" (fixado → urgente → não-lido → recente) precisa passar a
ser produzida no backend — hoje ela roda inteiramente no cliente via `sortFeed()`, sobre o lote
completo, o que é incompatível com paginar sem quebrar a priorização de não-lidos entre páginas.

## What Changes

- `GET /api/posts` passa a aceitar paginação por **cursor** (não offset) via `?limit` e `?cursor`,
  com defaults compatíveis com o comportamento atual quando o parâmetro não é enviado.
- A **ordenação inteligente** do feed do colaborador (fixado → urgente → não-lido → recente) é
  movida para o backend (sort/agregação do Mongo), usando um `$lookup` na coleção de interações do
  usuário autenticado para determinar "não-lido" — antes esse dado só existia no cliente
  (`userData.read`).
- A resposta, quando paginada, passa a ser um envelope `{ items, nextCursor, hasMore }`; sem
  `limit`/`cursor` a rota continua devolvendo o array simples (compatibilidade).
- Sem regressão nos filtros existentes: `?search` (I-09), `?archive` (I-12), `?category` e
  `?groupId` continuam funcionando, apenas passam a ter cursor por cima.
- As rotas de admin seguem sem ordenação inteligente (só fixado → data desc, como hoje), mas também
  passam a suportar paginação para o list-view do admin.

## Capabilities

### New Capabilities
- `paginacao-comunicados`: contrato de paginação por cursor de `GET /api/posts`, ordenação
  inteligente por fixado/urgente/não-lido no backend e compatibilidade com `?search`/`?archive`/
  `?category`/`?groupId`, sem desalinhar o cursor com posts novos vindos via SSE (I-07).

### Modified Capabilities
- (vazio — o contrato de `GET /api/posts` de comunicados é ampliado no novo capability; a spec
  existente `comunicados` continua válida e não é alterada.)

## Impact

- **backend**: `src/routes/` (handler de `GET /api/posts`), modelo `Comunicado`
  (novos índices/agregação) e coleção `Interaction` (uso em `$lookup`). Sem mudança de schema
  obrigatória; requer índices de performance (verificar antes de implementar).
- **frontend_pwa**: `feed.js` para de re-ordenar localmente por não-lido/urgente e passa a consumir
  `{ items, nextCursor, hasMore }` (infinite scroll) — change `2026-09-01-infinite-scroll-feed`.
- **frontend_admin**: `list-view.js` passa a consumir paginação — change
  `2026-09-01-paginacao-comunicados`.
- Nenhuma mudança de dependência; sem breaking de contrato para chamadas sem `limit`.
