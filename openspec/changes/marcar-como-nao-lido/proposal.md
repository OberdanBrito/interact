## Why

Permitir ao colaborador reverter a leitura de um comunicado (marcar como não lido). O backend já
aceita `read: false` em `PUT /api/interactions/:postId`, mas não limpa `readAt` na transição
lido → não-lido, deixando o timestamp inconsistente com o estado de leitura e com as métricas
"quem leu" do admin.

## What Changes

- `PUT /api/interactions/:postId`: ao receber `read: false` sobre um documento com `read: true`,
  o backend limpa `readAt` (seta `null`), preservando a semântica de "não-lido".
- `readAt` continua sendo preenchido na transição não-lido → lido (`read: true`), como hoje.
- `GET /api/interactions/members` passa a refletir a reversão: o colaborador que reverteu aparece
  com `read: false` e `readAt: null` (decisão do dono: limpar `readAt` ao reverter).

## Capabilities

### New Capabilities
- `interactions`: comportamento do endpoint de interações para a reversão de leitura
  (`readAt` limpo na transição lido → não-lido).

### Modified Capabilities
<!-- Nenhuma spec principal existente muda de comportamento (comunicados não é afetado). -->

## Impact

- `backend/src/routes/interactions.js` — bloco do `PUT /:postId` (transição `read`).
- Sem mudança de schema (campo `readAt` já existe no model `Interaction`).
- Agregados `GET /api/interactions?postId=` e `GET /api/interactions/summary` contam pelo booleano
  `read` e não são afetados.