## Why

O feed do colaborador carrega e renderiza todos os comunicados de uma vez, sem any paginação,
re-ordenando localmente por fixado/urgente/não-lido/recente (`sortFeed()`). Com o volume crescendo,
isso não escala e a ordenação no cliente é incompatível com carregar só uma página por vez (I-10).
A ordenação passa a ser produzida pronta pelo backend; o PWA só precisa consumir o cursor.

## What Changes

- `feed.js` para de executar `sortFeed()` para fixado/urgente/não-lido (ordenação agora vem pronta
  do backend) e passa a **consumir** `{ items, nextCursor, hasMore }` de `GET /api/posts`.
- Adiciona **infinite scroll**: carrega a próxima página ao rolar até o fim, sem duplicar cards e
  sem "pulos" de itens não-lidos entre páginas.
- Mantém a composição com `?search` (I-09), `?archive` (I-12), `?category`, `?groupId` e seletor de
  ambiente: cada nova página respeita o recorte corrente.
- Compatível com posts novos via SSE (I-07): inserção no topo via `post:new` não desalinha o cursor
  de paginação (cursor opaco baseado na chave de ordenação).
- Cache offline (Dexie) passa a guardar o recorte paginado (última página buscada), sem quebrar a
  leitura offline nem o badge de não-lidos.

## Capabilities

### New Capabilities
- `infinite-scroll-feed`: consumo da paginação por cursor no feed do colaborador (infinite scroll),
  remoção da ordenação local duplicada e compatibilidade com busca/arquivo/SSE/cache offline.

### Modified Capabilities
- (vazio — o comportamento offline/existente do feed continua; a paginação é adicionada como novo
  capability.)

## Impact

- **frontend_pwa**: `src/features/feed/feed.js` (remover `sortFeed` para não-lido/urgente; adicionar
  infinite scroll), `src/features/feed/templates.js` (estado "carregar mais"/fim), `src/data/posts.js`
  (`getPosts` passa a enviar `limit`/`cursor` e retornar envelope), `src/data/cache.js` (recorte
  paginado), e re-render de `applyRealtimeEvent`/`startRealtime` para não duplicar páginas.
- **backend**: consome o novo envelope de `GET /api/posts` (change `2026-09-01-paginacao-comunicados`).
- Nenhuma mudança de dependência.
