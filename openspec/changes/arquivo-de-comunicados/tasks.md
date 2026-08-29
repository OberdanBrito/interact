## 1. Constante do corte de idade

- [x] 1.1 Adicionar a constante `ARCHIVE_AFTER_DAYS` (default 30, lida de `process.env.ARCHIVE_AFTER_DAYS`) em `src/routes/posts.js` (ou arquivo de config) e usar `Number.parseInt` com fallback seguro.

## 2. Filtro ?archive no GET /api/posts

- [x] 2.1 Ler o parâmetro `archive` do `req.query` no `GET /api/posts` e ignorá-lo quando `req.user.role === "admin"`.
- [x] 2.2 Para colaborador, quando `archive === "active"`, adicionar ao `filter` a condição `dateISO >= now - ARCHIVE_AFTER_DAYS`; quando `archive === "archived"`, `dateISO < now - ARCHIVE_AFTER_DAYS`; quando ausente ou inválido, não aplicar restrição de idade.
- [x] 2.3 Garantir que o filtro de idade se combina com `category`, `search` e `groupId` (o `$and` existente) sem regressão na visibilidade.

## 3. Testes de integração

- [x] 3.1 Estender `scripts/qa-i11.mjs` ou criar `scripts/qa-i12.mjs` cobrindo: `?archive=active` retorna só recentes; `?archive=archived` retorna só antigos; sem parâmetro retorna tudo; busca (`search`) funciona dentro do arquivo; `groupId` respeita visibilidade no arquivo; admin ignora `?archive`; publicar comunicado com `dateISO` passado (via POST/`dateISO` ou edição) para simular "antigo" e verificar o corte de 30 dias.
- [x] 3.2 Registrar o script em `package.json` (ex.: `test:integration` ou script dedicado `qa:i12`) seguindo a regra 11 da esteira (testes versionados).
- [x] 3.3 Rodar os testes no Mongo real (docker) e conferir o resultado (todos passando).

## 4. Build/verificação

- [x] 4.1 Rodar `node --check` nos arquivos alterados e confirmar que o servidor sobe sem erros (`npm run dev` / boot).