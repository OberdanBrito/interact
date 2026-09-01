## Why

O feed do colaborador hoje só busca posts no load/render (`getPosts()` sem revalidação): um novo
comunicado não aparece até o colaborador recarregar ou trocar de aba. A I-07 (backend) entregou o
canal SSE compartilhado (`GET /api/events`). Este change consome esse canal no PWA: novos
comunicados entram no feed **sem reload**, e edits/expirados são refletidos — com reconexão e
fallback para o polling existente em rede instável. Também cria o **módulo de conexão reutilizável**
que a I-14 importará (não copiará) no admin.

## What Changes

- Novo **`src/data/events.js`** — módulo de conexão SSE **reutilizável e exportado**, consumindo
  `GET /api/events?token=<jwt>` (EventSource nativo): conecta, subscreve eventos por nome
  (`post:new`, `post:updated`, `post:expired`, e qualquer outro que a I-14 assinar), **reconecta
  automaticamente** quando a conexão cai, e **degrada para polling (60s) após 3 falhas seguidas**
  de SSE, retornando ao push quando o canal volta. Interface funcional simples (ex.: `connect()` /
  `on(event, cb)` / `disconnect()`), exportada de forma que o admin/I-14 reutilize a mesma
  assinatura em vez de reimplementar.
- **`src/data/posts.js`** — recebe os eventos do canal e orquestra a atualização da lista em
  memória e do cache offline (Dexie): `post:new` insere, `post:updated` substitui, `post:expired`
  marca como inválido.
- **`src/features/feed/feed.js`** — **re-render incremental**: um `post:new` é inserido sem reload
  na posição correta pela ordenação inteligente (fixado → urgente → não-lido → recente); um
  `post:updated` re-renderiza só o card afetado/diferenciado; `post:expired` remove/marca o card e
  reordena. `refreshBadge()` é re-executado para refletir novos não-lidos.
- **Fallback de polling** — quando o SSE falha 3x seguidas, o sistema passa a re-buscar
  `getPosts()` em intervalos de 60s (mesma janela já usada como fallback/limite atual), voltando ao
  SSE assim que o canal reconectar.
- **Sem regressão** — cache offline (IndexedDB/Dexie) e badge de não-lidos continuam funcionando:
  inserções/edições fúteis são persistidas no cache; eventos que não se aplicam à visão atual
  (ex.: grupo não-selecionado, aba Arquivo) são ignorados sem quebrar o estado.

## Capabilities

### New Capabilities

- `feed-tempo-real`: consumo do canal SSE no feed do colaborador — assinatura via módulo
  reutilizável, inserção/edição/expiração incremental **sem reload**, reconexão automática e
  fallback para polling (60s) após 3 falhas seguidas, sem regressão no cache offline nem no badge
  de não-lidos.

### Modified Capabilities

_(nenhuma — o comportamento offline/de busca/interações existentes não muda; `busca-feed` e
`interacoes-colaborador` continuam como estão.)_

## Impact

- `frontend_pwa/src/data/events.js` — **novo** módulo de conexão SSE reutilizável (reconexão +
  polling fallback).
- `frontend_pwa/src/data/posts.js` — hooks do canal: tratar `post:new`/`post:updated`/`post:expired`
  e atualizar a lista em memória + cache Dexie.
- `frontend_pwa/src/features/feed/feed.js` — inserção/edição/remoção incremental (`renderFeed`
  diferenciado) e disparo do fallback de polling.
- `frontend_pwa/src/data/cache.js` — atualização incremental do cache (novo/atualizado/expirado),
  respeitando o recorte já buscado (ativo/arquivo, grupo, busca).
- `frontend_pwa/src/app/main.js` — iniciar a assinatura do canal após o login (e desconectar no
  logout).
- **Fora de escopo** (changes próprios): backend (`backend/canal-tempo-real`), consumo no admin e o
  evento `interaction:changed` (I-14), e a paginação/infinite scroll (I-10 — revisar o ponto de
  inserção se/produto depois).
