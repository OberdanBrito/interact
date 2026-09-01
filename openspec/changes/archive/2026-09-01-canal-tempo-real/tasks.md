## 1. Módulo de conexão SSE reutilizável

- [x] 1.1 Criar `src/data/events.js` com um módulo genérico de conexão a `GET /api/events?token=<jwt>`
      (EventSource nativo), expondo `connect()`, `on(eventName, cb)`, `disconnect()` e um
      `Map<eventName, Set<cb>>` para despachar por nome; verificar `node --check src/data/events.js`.
- [x] 1.2 Adicionar gestão de ciclo de conexão no módulo: contador de falhas consecutivas de
      `onerror`; ao atingir **3**, trocar para um callback de **polling** (intervalo 60s); ao
      `onopen`, limpar o intervalo, zerar o contador e retomar o push; verificar que isso não expõe
      erro visível (sem console uncaught).

## 2. Integração no feed

- [x] 2.1 Em `src/data/posts.js`, adicionar um coordenador de eventos (ex.: `applyRealtimeEvent(name,
      postData)`) que muta a lista em memória (`CACHE`) — insere/substitui/remove, **dedupe por id**
      — e persiste via `cachePosts(CACHE)`; verificar com teste manual que um post novo entra no
      `CACHE` sem re-fetch.
- [x] 2.2 Em `src/features/feed/feed.js`, registrar os handlers do canal (`on("post:new")`,
      `on("post:updated")`, `on("post:expired")`) e re-renderizar **a partir do recorte em memória**
      (sem chamar `getPosts()`), reusando `sortFeed`/`sortByDate` + `postCardHTML` e chamando
      `refreshBadge()`; verificar que um `post:new` aparece sem reload na posição correta.
- [x] 2.3 Fazer a checagem **client-side** de aplicabilidade do evento à visão atual
      (`state.search`, `state.filter`, `state.activeGroupId`, `state.archive`) — evento não
      correspondente é ignorado sem quebrar o estado; verificar que um `post:new` de categoria/grupo
      fora do recorte não aparece e não corrompe a lista.
- [x] 2.4 Em `src/data/cache.js`, garantir que a atualização incremental respeita o recorte já
      buscado (ativo/arquivo, grupo, busca) e não duplica; verificar que o cache Dexie reflete
      inserção/edição/expiração sem regressão offline.

## 3. Wiring de boot

- [x] 3.1 Em `src/app/main.js`, chamar `connect()` após o login restaurado (e registrar os handlers
      do feed) e `disconnect()` no logout — sem vazar entre usuários; verificar que a assinatura
      inicia só autenticado e encerra no logout.
- [x] 3.2 Garantir que o comportamento offline de `getPosts()`/cache existente seja preservado (o
      módulo não muda o caminho do `fetch` de `getPosts()`); verificar que o modo offline continua
      funcionando.

## 4. Verificação

- [x] 4.1 E2E manual: publicar um comunicado no `frontend_admin` (`:5174`) e verificar no PWA
      (`:5173`) que ele aparece no feed **em ≤ 5s sem reload** (e na posição correta); checar que
      um rascunho/agendado NÃO aparece.
- [x] 4.2 Testar a resiliência: simular queda de rede (Playwright offline / devtools) e confirmar o
      **fallback de polling** (feed continua atualizando, sem erro) e a **retomada do push** quando a
      rede volta; screenshot em `/tmp/opencode/`.
- [x] 4.3 Rodar `npm run build` (deve passar com exit 0) e `node --check` nos arquivos alterados;
      confirmar sem regressão no badge de não-lidos e no cache offline.
