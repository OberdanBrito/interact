## Why

Permitir ao colaborador reverter a leitura de um comunicado direto na UI. Hoje o PWA só marca
como lido; falta a ação "Marcar como não lido" no sheet, o efeito na ordenação inteligente do
feed e a recontagem do badge de não-lidos.

## What Changes

- Nova ação **"Marcar como não lido"** exibida quando o post está lido (no sheet e no footer do
  card, ambos renderizados por `actionButtonsHTML`).
- `markUnreadPersist` em `session.js`: remove o `postId` da lista `read`, persiste no
  localStorage, enfileira `{ read: false }` na fila offline e sincroniza ao backend.
- Feed reordenado após a reversão: o post volta para o grupo de não-lidos da ordenação
  inteligente (urgentes → não-lidos → recentes).
- Badge de não-lidos recontado após a reversão (mesma contagem de `refreshBadge`).

## Capabilities

### New Capabilities
- `interacoes-colaborador`: ações de leitura do colaborador — confirmar leitura, marcar como não
  lido, e os efeitos no feed (ordenação) e no badge.

### Modified Capabilities
<!-- Nenhuma spec principal existe ainda em frontend_pwa/openspec/specs. -->

## Impact

- `frontend_pwa/src/features/auth/session.js` — `markUnreadPersist`.
- `frontend_pwa/src/features/interactions/interactions.js` — handler da ação `.js-unread` e
  atualização do card/sheet (`syncPostUI`).
- `frontend_pwa/src/features/feed/templates.js` — `actionButtonsHTML`: botão "Marcar como não lido".
- `frontend_pwa/src/features/feed/feed.js` — `renderFeed` para reordenar após a reversão.
- `frontend_pwa/src/features/notifications/badge.js` — `refreshBadge` recontado pela persist.
- `frontend_pwa/src/app/main.js` — bind do clique em `.js-unread`.