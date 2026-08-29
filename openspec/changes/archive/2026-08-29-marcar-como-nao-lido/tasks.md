## 1. Implementação backend

- [x] 1.1 Adicionar em `src/routes/interactions.js` (PUT /:postId) a transição `read: false` sobre
      doc existente com `read: true` limpando `readAt` (null), ao lado da regra atual de
      preenchimento de `readAt`.
- [x] 1.2 Rodar `node --check src/routes/interactions.js` e garantir que a resposta do PUT
      continua `{ postId, liked, read }`.

## 2. Testes de integração (Mongo real)

- [x] 2.1 Escrever/cobrir teste de integração: `PUT` com `read: false` em doc `read: true` limpa
      `readAt` (null) e responde 200 com `read: false`.
- [x] 2.2 Cobrir caso sem documento prévio (`read: false` cria doc com `readAt: null`) e o
      preenchimento de `readAt` na confirmação (`read: true`).
- [x] 2.3 Validar `GET /api/interactions/members` refletindo reversão (`read: false`,
      `readAt: null`).