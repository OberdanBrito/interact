## 1. Filtros no summary

- [x] 1.1 Em `src/routes/interactions.js`, na rota `GET /api/interactions/summary`, ler os
      parâmetros opcionais `desde`, `ate` e `groupId` de `req.query` e, quando `desde`/`ate`
      estiverem presentes e em formato de data inválido, responder `400` com `{ error: "Data
      inválida" }` — verificar via `curl` com `desde=abc` → `400`.
- [x] 1.2 Aplicar o recorte por período na agregação: incluir uma interação se `readAt` ou
      `likedAt` cair dentro do intervalo `[desde, ate]` (quando informados), mantendo o mesmo
      loop de agregação — verificar via `curl` com `desde`/`ate` retornando apenas interações do
      intervalo.
- [x] 1.3 Aplicar o recorte por grupo: resolver os `groupIds` dos usuários afetados
      (`User.find(...).select("groupIds")`) e incluir apenas interações cujo colaborador
      pertence ao `groupId` informado — verificar via `curl` com `groupId` de um grupo
      filtrando para os usuários daquele grupo.
- [x] 1.4 Garantir retrocompatibilidade: sem nenhum filtro, a rota mantém o comportamento
      atual (todas as interações) e o formato `{ [postId]: { reads, likes } }` inalterado —
      verificar rodando `npm run test:integration` (ou o QA de interações) passando.
- [x] 1.5 Validar sintaxe/estática do backend: rodar `node --check src/routes/interactions.js`
      (ou o `npm run build`/lint do componente) sem erros.

## 2. Verificação de integração

- [x] 2.1 Rodar `npm run test:integration` (Mongo real) e confirmar que os testes de interações
      continuam verdes, incluindo o summary sem filtros e com filtros de período/grupo.
