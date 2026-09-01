## 1. Consumir o envelope do backend

- [x] 1.1 Atualizar `getPosts(groupId, { archive, search }, { limit, cursor })` em
      `src/data/posts.js` para enviar `limit` (+ `cursor`) e `category`, e devolver
      `{ items, nextCursor, hasMore }`; tratar resposta array (backend antigo) como página única sem
      `hasMore` — validar por QA
- [x] 1.2 Setar `state.feed = { page, nextCursor, hasMore, loading, itemById }` e alimentar
      `itemById` com os ids dos itens carregados; validar que a primeira página popula o estado

## 2. Infinite scroll

- [x] 2.1 Adicionar sentinel `#feed-sentinel` no fim de `#post-list` e um `IntersectionObserver` que
      chama `loadMore()` quando visível e `hasMore` for `true`; validar em QA que rolar até o fim
      carrega a próxima página
- [x] 2.2 Implementar `loadMore()` (busca com `nextCursor` corrente) e `appendPage(items)` que
      acrescenta os cards sem re-renderizar a lista inteira, evitando duplicados via `itemById` —
      validar com duplo scroll
- [x] 2.3 Exibir estado de carregando/fim de lista (`hasMore === false` interrompe novas buscas) —
      validar que não há novas requests após o fim

## 3. Remover a ordenação local do feed ativo

- [x] 3.1 Remover/desativar `sortFeed()` (pinned/urgent/unread) do `feed.js` para o feed ativo,
      usando a ordem do servidor; manter a aba Arquivo por data desc — validar ordem de cards por QA
- [x] 3.2 Ajustar `visiblePosts()`/`renderPosts()` para operar sobre o recorte acumulado sem
      reordenação local do feed ativo

## 4. Composição com busca/categoria/ambiente/arquivo

- [x] 4.1 Enviar `category` ao backend (nome do chip ativo) em vez de filtrar client-side; remover a
      filtragem por categoria só na página
- [x] 4.2 Resetar `state.feed` (cursor null) e buscar a primeira página ao mudar `search`/
      `category`/`groupId`/`archive` — validar que cada recorte reinicia a lista
- [x] 4.3 Garantir que mudar aba Ativos/Arquivo reinicia a paginação (arquivo usa ordem data desc)

## 5. SSE composto com paginação

- [x] 5.1 Ajustar `applyRealtimeEvent`/`startRealtime` para inserir `post:new` elegível no topo
      (reservando id em `itemById`), e `post:updated`/`post:expired` mutando/removendo o item
      presente, sem duplicar
- [x] 5.2 Confirmar que o `nextCursor` carregado não é recomputado ao inserir `post:new` (páginas
      seguintes estáveis) e que o badge/cache são atualizados

## 6. Cache offline e verificação final

- [x] 6.1 Ajustar `cachePosts`/`getCachedPosts` para acumular os itens das páginas carregadas
      (upsert por id) e validar leitura offline + fallback `filterCachedByGroup` sem duplicados
- [x] 6.2 Rodar `npm run build` no frontend_pwa e o QA (scripts de feed/offline) para confirmar
      infinite scroll, ordem de servidor, cache e badge
