## 1. Infraestrutura do canal

- [x] 1.1 Criar `src/events.js` exportando um `EventEmitter` singleton (`emitter`) com
      `emitter.setMaxListeners(0)` e os nomes de evento do feed (`post:new`, `post:updated`,
      `post:expired`) referenciados como constantes; verificar com `node --check src/events.js`.
- [x] 1.2 Documentar as novas env vars opcionais (`SSE_HEARTBEAT_MS` default 30000 e
      `SSE_EXPIRED_SWEEP_MS` default 60000) nos defaults de `src/config`/`.env.example` (onde já há
      env defaults) e verificar que não quebram o boot.

## 2. Endpoint SSE

- [x] 2.1 Criar `src/routes/events.js`: handler de `GET /api/events` que (a) aceita o token por
      `?token=` quando não houver header `Authorization`, (b) chama o middleware de auth JWT
      existente, (c) escreve `res.writeHead(200, { 'Content-Type':'text/event-stream',
      'Cache-Control':'no-cache', Connection:'keep-alive' })`, (d) registra um listener no
      `emitter` que grava `event: <name>\ndata: <json>\n\n`, (e) envia heartbeat (`:keepalive\n\n`)
      a cada `SSE_HEARTBEAT_MS`, e (f) em `req.on("close")` remove o listener e limpa o heartbeat;
      verificar com `node --check src/routes/events.js`.
- [x] 2.2 Registrar a rota em `src/routes/index.js` (`router.use("/events", eventsRouter)`) e
      verificar que `GET /api/events` responde `200 text/event-stream` com token válido e `401`
      sem token (curl).

## 3. Emissores de eventos

- [x] 3.1 Em `src/routes/posts.js` no `POST`, após salvar, emitir `post:new` (payload `toPost(doc)`)
      **somente** quando `!isDraft && !scheduledAt` (publicação imediata); verificar que um
      comunicado publicado dispara o evento e um rascunho NÃO dispara.
- [x] 3.2 Em `src/routes/posts.js` no `PUT`, após salvar, emitir `post:updated` (payload
      `toPost(doc)`) somente quando o comunicado está visível (`published === true`); verificar que
      editar um publicado dispara e editar um rascunho/agendado NÃO dispara.
- [x] 3.3 Em `src/scheduler.js` no `release`, quando um agendado vira publicado, emitir `post:new`
      (payload `toPost(doc)`); verificar que a liberação dispara o evento.
- [x] 3.4 Implementar o sweep de expiração (intervalo a cada `SSE_EXPIRED_SWEEP_MS`): buscar
      comunicados publicados com `expiresAt < now` e emitir `post:expired` (`{ id }`), deduplicando
      por um `Set` em memória por processo; verificar que um comunicado expirado dispara `post:expired`
      e que o documento NÃO é deletado.
- [x] 3.5 Garantir que as emissões são pós-save e "fire-and-forget" (try/catch em volta do
      `emitter.emit`), de modo que um `POST`/`PUT` responda normalmente mesmo sem clientes
      conectados; verificar que a mutação não depende do canal.

## 4. Verificação

- [x] 4.1 Testar manualmente com um cliente SSE (ex.: `curl -N --max-time 60 /api/events?token=<jwt>`
      ou um `EventSource` no browser de dev) que: recebe heartbeat, recebe `post:new`/`post:updated`
      ao publicar/editar, e **exclui dados sensíveis** — o token NÃO aparece em logs.
- [x] 4.2 Criar `scripts/qa-i07.mjs` (teste de integração contra Mongo real) cobrindo: 401 sem
      token, 200 com token, receber `post:new`/`post:updated`, receber `post:expired` sem delete, e
      `post:new` NÃO disparado por rascunho/agendado; registrar o script no `test:integration`
      (`package.json`) e rodar `npm run qa:i07` + `npm run test:integration`.
- [x] 4.3 Rodar `node --check` em todos os arquivos alterados e confirmar que
      `GET/POST/PUT /api/posts` e `PUT /api/interactions/:postId` seguem respondendo (sem regressão
      no contrato REST).
