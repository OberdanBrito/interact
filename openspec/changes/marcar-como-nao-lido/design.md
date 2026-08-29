## Context

O endpoint `PUT /api/interactions/:postId` (backend/src/routes/interactions.js) já aceita
`read: false` e aplica o patch via upsert do documento `Interaction` (postId, userId). O que falta
é o tratamento do timestamp: hoje `readAt` só é preenchido quando `read` vai de `false` para
`true` (linha `if (read === true && !existing?.read) patch.readAt = new Date();`), mas nunca é
limpo na transição inversa. Decisão do dono (issue #4): **limpar `readAt` ao reverter** para que
as métricas "quem leu" do admin reflitam exatamente a reversão.

## Goals / Non-Goals

**Goals:**
- `readAt` refletir o estado de leitura: `read: false` ⇒ `readAt: null`; `read: true` ⇒
  `readAt` preenchido na transição.
- Manter compatibilidade com o fluxo atual (upsert, resposta `{ postId, liked, read }`).

**Non-Goals:**
- Não alterar o esquema do model `Interaction` (`readAt` já existe, `Date`, default `null`).
- Não mexer nos agregados `GET /api/interactions?postId=` e `/summary`, que contam pelo booleano
  `read` e já refletem a reversão.
- Não alterar o comportamento de `liked`/`likedAt`.

## Decisions

- **Limpar `readAt` na transição lido → não-lido.** Adicionar
  `if (read === false && existing?.read) patch.readAt = null;` ao lado da regra existente de
  preenchimento. Alternativa considerada: manter `readAt` preservado e só inverter o booleano —
  rejeitada pelo dono porque `readAt` ("quando leu") ficaria semanticamente falso e confundiria a
  métrica "quem leu" no admin.
- **Upsert cobre o caso sem documento prévio.** Com `setDefaultsOnInsert`, um `read: false` sem
  documento existente cria `{ read: false, readAt: null }` — consistente com o estado "nunca leu".
- A resposta do `PUT` continua `{ postId, liked, read }` (não expõe `readAt`), evitando mudança de
  contrato com o PWA.

## Risks / Trade-offs

- [Colaborador com `readAt` antigo e `read: false` deixado por um documento legado] → O `PUT` com
  `read: false` limpa `readAt` apenas se `existing.read` era `true`; um doc legado com
  `read:false`/`readAt` preenchido não é tocado. Aceitável: o PWA sempre envia `read:false` ao
  reverter, então o documento é atualizado no momento da reversão.
- [Interação concorrente (upsert `$setOnInsert`)] → Regras de transição usam `existing` lido antes
  do upsert; janela mínima e idempotente (mesmo resultado ao repetir).