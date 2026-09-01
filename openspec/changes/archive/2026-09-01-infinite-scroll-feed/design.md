## Context

Ver proposal.md - Why. Estado atual: `getPosts(groupId, {archive, search})`
(`src/data/posts.js:54-83`) busca sem `limit`/`cursor` e recebe array; atribui `CACHE = posts` e
`cachePosts(posts)`. `feed.js:103-115` `sortFeed()` reordena client-side por fixado → urgente →
não-lido → recente. `renderFeed()` (`feed.js:201-204`) chama `visiblePosts()` → `getPosts()` →
filtra categoria → ordena → `renderPostList()` (`171-199`) que injeta `innerHTML` de todos os cards
de uma vez. Não existe infinite scroll/load-more/IntersectionObserver. RealTime
(`applyRealtimeEvent`, `posts.js:139-158` + `startRealtime`, `feed.js:208-224`) muta `CACHE` e
re-renderiza a partir do cache. Não-lido é `localStorage interact.user.<email>.read`; urgente é
campo booleano do post. Cache Dexie é tabela `posts` keyed por `id` (snapshot completo).

## Goals / Non-Goals

**Goals:**
- Consumir o envelope `{ items, nextCursor, hasMore }` do backend e implementar infinite scroll.
- Remover a reordenação local por fixado/urgente/não-lido do feed ativo (ordem pronta do backend);
  arquivo continua data desc.
- Compor paginação com `?search`, `?category`, `?groupId` (ambiente) e `?archive`, reiniciando a
  página ao mudar recorte.
- Manter cache offline e badge de não-lidos funcionando com o recorte paginado.
- Não desalinhar o cursor com inserções via SSE.

**Non-Goals:**
- Não manter `sortFeed` para o feed ativo (remover a lógica de pinned/urgent/unread local).
- Não paginar o arquivo com ordenação inteligente (segue data desc).
- Não alterar o fluxo de interações (curtir/ler/desmarcar) nem a métrica do admin.
- Não alterar o backend (já atualizado na change `2026-09-01-paginacao-comunicados`).

## Decisions

**D1 — `getPosts` retorna o envelope e acumula páginas.** `getPosts(groupId, {archive, search,
category}, { limit, cursor })` passa a enviar `limit` (+ `cursor` quando existir) e `category`, e
devolve `{ items, nextCursor, hasMore }`. O chamador acumula `items` em um estado de feed
(`state.feedItems`/`state.nextCursor`/`state.hasMore`). Category passa a ser parâmetro de backend
(deixar de filtrar só na página — inviável com paginação). Alternativa (manter categoria client-side)
rejeitada: filtraria apenas a página carregada.

**D2 — Infinite scroll via sentinel + IntersectionObserver.** Novo sentinel `#feed-sentinel` no fim
de `#post-list`; um `IntersectionObserver` dispara `loadMore()` quando visível e `hasMore` é `true`.
`loadMore()` busca a próxima página com o `nextCursor` corrente e **acrescenta** os `items` ao DOM
(sem re-renderizar a lista inteira). Estado de carregando/fim (`#feed-loading`/`#feed-end`)
controlado por `hasMore`. «Não duplicar» garantido por um `Set` de ids já renderizados.

**D3 — Estado de recorte + reset de cursor.** `state` ganha `feed = { page, nextCursor, hasMore,
loading, itemById(mapa de ids já renderizados) }`. Toda mudança de `search`/`category`/`groupId`/
`archive` reseta `feed` (cursor null) e dispara a busca da primeira página. `renderFeed()` passa a
ser dividida em `renderFeed()` (primeira página / reset) e `appendPage(posts)` (páginas seguintes).

**D4 — Manter a ordem do servidor.** `visiblePosts()`/`sortFeed()` deixam de reordenar o feed ativo:
a ordem recebida é usada como está. `sortFeed` é removida/desativada para o feed ativo; a aba
Arquivo usa a ordem de servidor do arquivo (data desc). Qualquer re-sort residual local é eliminado.

**D5 — SSE composto com paginação.** `applyRealtimeEvent` continua mutando o mapa de itens do recorte
carregado: `post:new` insere no topo se cabível ao recorte (e reserva id no `Set`); `post:updated`/
`post:expired` mutam/removem o item presente. Para não desalinhar o cursor, o `nextCursor` já
carregado **não é recomputado** ao inserir `post:new` (keyset do backend garante a estabilidade);
uma inserção no topo apenas marca que a primeira página foi "deslocada", e o badge/cache são
atualizados. Duplicidade evitada pelo `Set` de ids.

**D6 — Cache offline do recorte.** `cachePosts(items)` passa a **acumular** os itens das páginas
carregadas (upsert por id) no recorte atual; o fallback offline (`filterCachedByGroup`) filtra esse
acúmulo como hoje. `clearCache` no logout mantém o comportamento (não vazar entre usuários). O badge
recalcula ao inserir não-lidos.

**Alternativa considerada (D7) — "Carregar mais" via botão em vez de IntersectionObserver:**
descartada — infinite scroll é o comportamento pedido (I-10) e o IntersectionObserver atende também
PWA/touch.

## Risks / Trade-offs

- [Acumular páginas sem re-render pode sair de sincronia com o cache] → Inserir/atualizar via helper
  único de merge por id (mapa `itemById`) usado tanto pelo loadMore quanto pelo SSE; teste de
  duplicidade.
- [Cursor de uma visão usado em outra] → resetar sempre a página ao mudar recorte; nunca reutilizar
  `nextCursor` de outro recorte.
- [Inserção `post:new` no topo faz a página 1 "encolher" (o último item dela ainda é o cursor)] →
  Como o cursor é do último item da página 1, a página 2 continua estável; apenas o item novo não é
  paginado de volta — aceitável (sem pulos/duplicados).
- [Remover `sortFeed` pode alterar a ordem se o backend não entregar a esperada] → Backend (change
  par) é entregue junto; QA valida a ordem de servidor e, se necessário, mantém `sortFeed` apenas no
  recorte carregado como fallback temporário.

## Migration Plan

1. Depender da change backend (`limit`/`cursor` + envelope) — integrar primeiro o backend.
2. Migrar `getPosts` para o envelope com fallback: se a resposta ainda for array (backend antigo no
   dev), tratar como página única sem `hasMore` (retrocompatível durante a implementação).
3. Ativar infinite scroll e remover `sortFeed` do feed ativo; validar busca/categoria/arquivo/
   ambiente + offline.

## Open Questions

- Nenhum que mude spec/approach/tasks.
