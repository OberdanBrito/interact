## Context

O backend não tem nenhuma infraestrutura de tempo real. Hoje o PWA busca posts só no load; a I-14
precisa de tempo real para a tela do admin. A decisão de arquitetura (proposal.md) é tornar a I-07
**dona do canal SSE compartilhado** para não duplicar mecanismo entre I-07 e I-14. Este design cobre
o lado **backend** (o canal em si); o consumo no PWA é change próprio do `frontend_pwa`.

Pontos do estado atual relevantes:
- Auth JWT é só via header `Authorization` (`src/middleware/auth.js`) — `EventSource` não envia
  header, então precisa aceitar `?token=`.
- Rotas agregadas em `src/routes/index.js` (`router.use("/posts", ...)`, etc.) montadas em
  `app.use("/api", routes)` → o endpoint do canal será `GET /api/events`.
- Publicação/liberação acontece em `src/routes/posts.js` (POST/PUT) e em `src/scheduler.js`
  (`release`, I-01). Expiração é **derivada** na consulta (I-05) — não há um momento natural de
  "expirou".

## Goals / Non-Goals

**Goals:**
- Fornecer `GET /api/events` (SSE autenticado) como canal genérico, com heartbeat e tolerância a
  (re)conexões.
- Emitir `post:new` / `post:updated` / `post:expired` nos pontos onde o feed muda para o
  colaborador.
- Contrato genérico reutilizável: a I-14 assina `interaction:changed` no mesmo emissor/endpoint,
  sem segundo endpoint nem segunda lib.

**Non-Goals:**
- Consumo no PWA (assinatura + re-render incremental + fallback polling 3x) → change `frontend_pwa`.
- Consumo no admin e o evento `interaction:changed` → I-14.
- Paginação/infinite scroll (I-10).
- Não altera contrato de `GET/POST/PUT /api/posts` nem de `PUT /api/interactions/:postId`.

## Decisions

### D1 — Módulo `src/events.js` com um `EventEmitter` singleton (nomes de evento)
Um único `EventEmitter` exportado (`emitter`), com `emitter.setMaxListeners(0)` (vários clientes
concorrentes). Nomes de evento do feed: `post:new`, `post:updated`, `post:expired`. Toda emissão de
evento passa por ele — inclusive o futuro `interaction:changed` da I-14 — o que dá o contrato
genérico sem duplicar infraestrutura.
- **Alternativa rejeitada**: um emitter por módulo de domínio (posts/interactions). Fragmenta o
  canal e obrigaria a I-14 a um segundo endpoint. Um singleton mantém um único `GET /api/events`.

### D2 — Endpoint `src/routes/events.js` que reûsa a auth JWT existente
`EventSource` não envia `Authorization`; para usar `EventSource` (que já traz reconexão embutida),
o endpoint aceita `?token=<jwt>`. Para não duplicar a lógica de verificação (mesmo `JWT_SECRET`,
mesmo `User.findById`), o handler **hoista** o query token para o header antes de chamar o middleware
`auth` existente:
```js
// events.js
const token = req.query.token;
if (!req.headers.authorization && token) req.headers.authorization = `Bearer ${token}`;
await auth(req, res, next); // middleware existente
```
- O token **nunca** é logado (logs de request não incluem query string) e exige HTTPS em prod.
- **Alternativa**: cliente SSE via `fetch` com stream + `Authorization` header (evita token na URL),
  mas exige reconexão manual e perde o built-in do `EventSource`. Como "reconexão automática é
  obrigatória" (mobile/instável), escolhi `EventSource` + `?token=`.

### D3 — Formato/entrega do evento e heartbeat
Conexão inicia com `res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control':
'no-cache', Connection: 'keep-alive' })`. Para cada `emitter.emit(name, payload)`, o handler escreve:
```
event: <name>\ndata: <json>\n\n
```
Heartbeat a cada `SSE_HEARTBEAT_MS` (default 30s, env) com comentário `:keepalive\n\n` para o
cliente detectar conexão morta e reconectar. `req.on("close")` remove o listener e limpa o
interval — sem vazamento por cliente abandonado.

### D4 — Payload do evento = comunicado serializado (`toPost`)
`post:new`/`post:updated` transmitem o comunicado completo via `toPost(doc)` (mesma forma de
`GET /api/posts`), para o cliente **inserir/diferenciar sem refetch** — importante para a futura
paginação (I-10) ("prepend, não reload"). `post:expired` transmite `{ id }` (mínimo; o cliente
remove/atualiza o card sem refetch).
- **Alternativa**: emitir só `{ id }` e forçar refetch. Mais simples, mas quebra o requisito de
  atualização ≤5s sem reload e atropela a paginação futura. Payload completo é a escolha.

### D5 — Pontos de emissão
- **`post:new`**: em `src/routes/posts.js` no `POST` quando `!isDraft && !scheduledAt` (publicação
  imediata) e em `src/scheduler.js` no `release` quando o agendado vira publicado.
- **`post:updated`**: em `PUT /api/posts/:id` após salvar, **somente se** o comunicado está visível
  ao colaborador (`published === true`), para não vazar rascunho/agendado.
- **`post:expired`**: expiração é derivada (I-05), então há um **sweep** (intervalo a cada
  `SSE_EXPIRED_SWEEP_MS`, default 1min) que busca comunicados publicados com `expiresAt < now` e emite
  `post:expired` uma vez por id usando um **Set em memória** (dedup por processo). Objetivo:
  idempotente do lado do cliente (tratar como "efetivou invalidade"); re-emitir após restart é
  benigno.
- Rascunho/agendado nunca emitem `post:new` (continuam invisíveis ao colaborador).

### D6 — Reutilização (I-14)
Nada no backend é específico de "post": o endpoint transmite **qualquer** evento nomeado emitido no
emitter. A I-14 só precisa de `emitter.emit("interaction:changed", { postId, userId })` — o mesmo
`GET /api/events` transmite, e o cliente assina pelo nome. O módulo de assinatura no cliente é
exportado (fica no PWA, change próprio) para o admin importar, não copiar.

## Risks / Trade-offs

- [**Token JWT na query string** (`?token=`) pode vazar em logs/referrer acessados sem HTTPS]
  → Mitigação: não logar query string; exigir HTTPS em prod; token curto duração (JWT já tem exp).
  Alternativa de fetch+header fica anotada como opção futura.
- [**`post:expired` derivado não tem "momento" natural**; sweep pode re-emitir após restart]
  → Mitigação: Set em memória (dedup no processo) + cliente idempotente (considerar `expired` como
  sinal de refresh/remoção). Re-emitir após restart é benigno.
- [**Vários clientes / reconexão** → vazamento de listeners]
  → Mitigação: `setMaxListeners(0)`, `req.on("close")` remove listener e limpa heartbeat.
- [**Sobrecarga determinística por emissão** (payload completo por evento)]
  → Aceito: volume de comunicados é baixo (empresa → colaborador); toPost é leve.
- [**A falha ao emitir NÃO deve quebrar a mutação**] → Mitigação: emissões são "fire-and-forget"
  pós-save (try/catch em volta do `emitter.emit`); o `POST`/`PUT` responde independentemente do
  canal.

## Migration Plan

- **Deploy**: sem migração de dados (nenhum campo novo no schema). Deploy aditivo — o endpoint
  `/api/events` e as emissões não afetam clientes que não assinam.
- **Rollback**: remover o módulo `events.js`/rota e voltar os pontos de emissão ao estado atual; o
  cliente (PWA) degrada para o polling 60s existente. Reversível e sem perda.

## Open Questions

Nenhuma bloqueante. O formato de payload e a autenticação por query token foram decididos em D2/D4;
a implementação do módulo de conexão (reconexão/fallback) é do change `frontend_pwa`.
