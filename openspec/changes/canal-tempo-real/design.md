## Context

O feed do PWA hoje nunca revalida: `renderFeed()` → `visiblePosts()` → `getPosts(activeGroupId, ...)`
busca da API e renderiza a partir do array retornado (guardado em `CACHE` no módulo
`data/posts.js`). Não há estado persistente de lista no `state`. O banco executou a I-07 (backend) e
entregou `GET /api/events` (SSE), autenticado por `?token=` (EventSource não envia `Authorization`) e
emitindo `post:new`/`post:updated`/`post:expired` (ver `backend/openspec/changes/canal-tempo-real`).
Este design cobre só o consumo no PWA; o backend/módulo de emissão é do change do backend.

## Goals / Non-Goals

**Goals:**
- Módulo de conexão SSE **reutilizável** (`src/data/events.js`), exportado para a I-14 importar.
- Feed reflete `post:new`/`post:updated`/`post:expired` **sem reload** e **sem re-fetch da lista**.
- Reconexão automática + fallback para polling (60s) após 3 falhas seguidas.
- Sem regressão no cache Dexie nem no badge de não-lidos.

**Non-Goals:**
- Backend/emissão (change do backend), consumo no admin e `interaction:changed` (I-14),
  paginação/infinite scroll (I-10).

## Decisions

### D1 — `src/data/events.js`: módulo de conexão genérico (EventSource + token em query)
Usa `EventSource(`${API_BASE}/api/events?token=${TOKEN}`)` — EventSource não envia header
`Authorization`, e o backend aceita `?token=`. A reconexão automática é embutida no EventSource
(`readyState`), mas o módulo acompanha `onerror` para decidir o fallback de polling. O módulo,
por si, genérico: assina qualquer evento nomeado (`addEventListener(name, handler)`) e entrega
callbacks por nome.
- **Alternativa**: SSE via `fetch` + stream com header `Authorization` (evita token na URL) — exige
  reconexão manual e perde o built-in do EventSource. Rejeitada: **reconexão automática é
  obrigatória** (mobile/instável) e o EventSource já a entrega. Token na URL é mitigado por não
  logar query string + HTTPS.

### D2 — Interface reutilizável: `connect()`, `on(name, cb)`, `disconnect()`, `onOpen`, `onPollingFallback`
O módulo expõe uma API pequena e estável. Registra callbacks de evento em um `Map<eventName,
Set<cb>>`; ao receber `event: <name>`, despacha aos callbacks do nome. Um consumidor externo (I-14
no admin) importa o mesmo módulo e chama `on("interaction:changed", ...)` sem reimplementar
conexão/reconexão/fallback. Os eventos não reconhecidos são ignorados (o cliente só escuta o que
registrou) — atende o contrato genérico do canal.

### D3 — Inserção/edição incremental sem re-fetch (reaproveita `CACHE` de `data/posts.js`)
Para inserir **sem reload e sem re-fetch**, mantemos a lista visível em memória. `getPosts()` já
grava o resultado em `CACHE` (módulo) — o feed passa a renderizar a partir de um recorte de `CACHE`
em vez de sempre re-buscar quando há um evento. Fluxo:
1. `data/posts.js` ganha um coordenador de eventos: `applyRealtimeEvent(name, postData)` que muta
   `CACHE` (insere/atualiza/remove) e persiste via `cachePosts(CACHE)` (Dexie).
2. `feed.js` registra os handlers e, ao receber um evento aplicável, **re-renderiza a lista a partir
   do recorte** (sem chamar `getPosts()`), reusando a ordenação (`sortFeed`/`sortByDate`) e
   `postCardHTML`, e chama `refreshBadge()`.
- Aplicabilidade é checada **client-side**: categoria (`state.filter`), busca (`state.search`),
  ambiente (`state.activeGroupId`) e aba (`state.archive`). Um `post:new` que não corresponde à
  visão atual (busca ativa, categoria diferente, Arquivo) é **ignorado** — senão quebra o recorte.
- **Alternativa**: emitir `{ id }` só e forçar `getPosts()`. Rejeitada: viola ≤5s sem reload e
  atropela a futura paginação. O backend já manda o payload em `toPost` (change backend).

### D4 — Fallback de polling (60s) após 3 falhas seguidas
O módulo conta falhas consecutivas de `onerror`. Ao atingir **3**, ele **dessubscribe** o
EventSource e inicia um `setInterval` de **60s** chamando um callback de polling (o feed re-busca
`getPosts()`). Se um `post:new` do EventSource não pode ser recebido nesse estado, o polling cobre a
atualização; quando o EventSource conseguir **reconectar** (`onopen`), o módulo limpa o intervalo,
reseta o contador e retoma o push. Nenhum erro é exibido ao usuário (o feed segue com o
comportamento de polling atual).

### D5 — Cache Dexie + badge sem regressão
`cachePosts(CACHE)` já persiste o recorte para leitura offline; as mutações incrementais chamam o
mesmo helper, então o cache acompanha. O badge é recalculado via `refreshBadge()` no pós-insert. A
assinatura é iniciada após o login (em `app/main.js`) e desligada no logout (`disconnect()`), para não
vazar entre usuários (mesmo princípio do `clearCache`).

## Risks / Trade-offs

- [**Token JWT na query string** (`?token=`)] → Mitigação: não logar query string; HTTPS em prod;
  token já expira (JWT). Alternativa `fetch`+header fica anotada.
- [**Lista em memória pode divergir do servidor** (ex.: removido de um grupo após o feed carregado)]
  → Mitigação: o fallback de polling (60s) revalida a lista; eventos não elegíveis são ignorados e
  o próximo `getPosts()` corrige.
- [**Inserir sem reload conflita com busca/filtro ativos**] → Mitigação: só aplica um evento se ele
  corresponde ao recorte atual (`state.search`/`state.filter`/`state.activeGroupId`); caso contrário
  ignora sem quebrar o estado.
- [**Reconexão via EventSource pode reemitir/duplicar**] → Mitigação: inserção é deduplicada por id
  (replace, não append duplicado) em `CACHE`.

## Migration Plan

- **Deploy**: aditivo; o feed continua funcionando sem o módulo (só não atualiza em tempo real).
  Nenhuma migração de dados.
- **Rollback**: desligar a assinatura (`disconnect()` no boot) → feed volta ao comportamento atual
  (busca no load/polling). Não afeta backend nem cache.

## Open Questions

Nenhuma bloqueante. A decisão D4 (fallback) e D3 (incremental sobre `CACHE`) definem a abordagem; a
integração com a paginação (I-10) é revisada depois, como o dono indicou.
