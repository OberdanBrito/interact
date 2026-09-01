## Why

O PWA hoje busca posts apenas no load/render (`getPosts()` sem revalidação), e a I-14 precisaria de
tempo real para atualizar "quem leu/curtiu" na tela do admin. Não existe nenhuma infraestrutura de
tempo real no projeto. Em vez de cada issue implementar o seu próprio mecanismo, a I-07 passa a ser
**dona do canal SSE compartilhado** (`GET /api/events`) que a I-14 assina depois — sem reimplementar
conexão.

## What Changes

- Novo endpoint **`GET /api/events` (SSE, autenticado)** que transmite um stream de eventos nomeados
  ao cliente. O canal é **genérico** (qualquer `event:`/`data:`), pronto para a I-14 assinar um
  evento futuro `interaction:changed` sem criar um segundo endpoint nem uma segunda lib de conexão.
- Novo módulo **`src/events.js`** com um `EventEmitter` interno (singleton) nomeando os eventos do
  feed: `post:new`, `post:updated`, `post:expired`.
- O emissor é disparado nos pontos onde hoje já existe mutação de post:
  - `POST /api/posts` (criação/publicação) e `PUT /api/posts` (edição/publicação/reagendamento) em
    `src/routes/posts.js` → emitem `post:new` (ficou visível ao colaborador) e `post:updated`
    (conteúdo/alvo alterado em um já visível).
  - Liberação do scheduler (I-01) em `src/scheduler.js` (`release`) → emite `post:new` quando o
    agendado vira publicado.
  - Exportação/tempo real de expiração (I-05): emite `post:expired` quando o sistema detecta que um
    comunicado expirou (varredura/checagem de elegibilidade — ver design). Nada é deletado.
- Autenticação do SSE via **JWT como query param `?token=`** (compatível com `EventSource`, que não
  envia `Authorization`); validada pelo mesmo middleware de auth JWT. O token nunca vaza em
  respostas nem logs.
- **Keep-alive/heartbeat** SSE (ping periódico) para o cliente detectar conexão morta e reconectar;
  o **fallback para polling (60s) após 3 falhas seguidas** é comportamento do cliente (módulo de
  conexão reutilizável), suportado pela infraestrutura deste endpoint.
- Sem regressão no cache offline (Dexie) nem no badge de não-lidos — o backend não muda o contrato
  de `GET /api/posts`/interações; só adiciona o canal.

## Capabilities

### New Capabilities

- `tempo-real`: canal de tempo real compartilhado do backend — `GET /api/events` (SSE) autenticado,
  emitindo eventos de comunicado (`post:new`, `post:updated`, `post:expired`) com ciclo de vida de
  conexão (heartbeat, reconexão) e contrato genérico reutilizável pela I-14.

### Modified Capabilities

_(nenhuma — o contrato REST de `comunicados`/`interactions` não muda; emitir eventos internos é
comportamento novo observável só via SSE, coberto pela capability `tempo-real`.)_

## Impact

- `backend/src/events.js` — **novo**: `EventEmitter` singleton + nomes de eventos do feed.
- `backend/src/routes/events.js` — **novo**: `GET /api/events` (SSE, JWT via `?token=`), heartbeat,
  registro/descarte de clientes.
- `backend/src/app.js` — monta a rota de eventos e injeta o emitter.
- `backend/src/routes/posts.js` — emite `post:new`/`post:updated`/`post:expired` nos pontos de
  criação/publicação/edição.
- `backend/src/scheduler.js` — `release` emite `post:new` ao liberar um agendado.
- Teste de integração versionado em `backend/scripts/qa-i07.mjs` (script `qa:i07` + registro no
  `test:integration`).
- **Fora de escopo** (changes próprios): consumo no PWA (`frontend_pwa`), consumo no admin e o
  evento `interaction:changed` (I-14), e a paginação/infinite scroll (I-10).
