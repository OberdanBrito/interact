## 1. Persistência e sincronização

- [x] 1.1 Adicionar `markUnreadPersist(postId)` em `src/features/auth/session.js`: remove
      `postId` de `state.userData.read`, persiste no localStorage, `enqueue(postId, { read: false })`,
      `syncNow()` e `refreshBadge()`.
- [x] 1.2 Garantir que a fila offline (`data/sync.js`) já envia `read: false` (sem mudança
      necessária — conferir).

## 2. UI e handlers

- [x] 2.1 Em `src/features/feed/templates.js`, renderizar botão "Marcar como não lido"
      (classe `js-unread`) em `actionButtonsHTML` quando `read === true` (card e sheet).
- [x] 2.2 Em `src/features/interactions/interactions.js`, adicionar `markUnread(postId)`: chama
      `markUnreadPersist`, atualiza o card/sheet via `syncPostUI` e chama `renderFeed()` para
      reordenar; tratar `readMode: "ack"` (botão "Confirmar leitura" volta a aparecer).
- [x] 2.3 Registrar o handler `.js-unread` no `bindActionContainer` e no `src/app/main.js`
      (bind do `#post-list` e do `#sheet-actions`).

## 3. Verificação

- [x] 3.1 `npm run build` no PWA sem erros.
- [x] 3.2 `node --check` nos arquivos alterados.