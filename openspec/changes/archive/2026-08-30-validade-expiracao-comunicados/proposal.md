## Why

Comunicados com prazo de validade (avisos de evento, promoções, políticas temporárias) ficam
no feed do colaborador indefinidamente, mesmo depois de perderem relevância. A I-05 permite
definir `expiresAt`; ao expirar, o comunicado sai do feed do colaborador automaticamente —
**sem delete** — preservando o histórico para o admin reativar.

## What Changes

- Model `Comunicado` ganha o campo opcional `expiresAt: Date` (default `null`).
- `toPost` passa a expor `expiresAt` (ISO ou `null`) e `expired` (derivado: `expiresAt != null &&
  expiresAt < now`). O campo `status` não muda (vida de publicação e validade são eixos
  separados: rascunho/agendado/publicado permanecem como hoje).
- `GET /api/posts` (colaborador): filtra expirados — o comunicado some do feed **tanto na visão
  "Ativos" quanto na "Arquivo"** (I-12). O admin **não** filtra: continua vendo só o que publicou,
  agora com `expired` no payload para exibir o selo e reativar.
- `GET /api/posts/:id` (colaborador): comunicado expirado não é elegível → `404` (mesmo padrão
  de invisibilidade existente).
- `POST` / `PUT /api/posts`: aceitam `expiresAt` **opcional** — data válida (no futuro ou já
  passada = expiração imediata); vazio/`null` limpa o campo (sem validade). Nunca bloqueia
  criar, salvar rascunho, publicar ou agendar. Reativar = limpar `expiresAt` (mantém o estado
  atual, ex.: publicado).
- Expiração não apaga o documento (histórico preservado).

## Capabilities

### New Capabilities

_(nenhuma — comportamento de listagem e payload existentes são estendidos)_

### Modified Capabilities

- `comunicados`: ganha os requisitos de validade/expiração — campo opcional `expiresAt`
  persistido e exposto no payload (`expiresAt` + `expired` derivado), filtro de expirados no
  GET do colaborador (incluindo arquivo), 404 no GET `/:id` do colaborador e aceite/limpeza
  do campo em POST/PUT.

## Impact

- `backend/src/models/Comunicado.js` — novo campo `expiresAt`.
- `backend/src/routes/posts.js` — `toPost` (expor `expiresAt`/`expired`), filtro de expirados
  no `GET /api/posts` (colaborador), elegibilidade no `GET /api/posts/:id`, aceite de
  `expiresAt` no `POST` e `PUT`.
- Contrato da API `GET/POST/PUT /api/posts` ampliado (campos novos, sem quebra — clientes
  antigos ignoram `expiresAt`/`expired` ausentes).
- Teste de integração versionado em `backend/scripts/qa-i05.mjs` (script `qa:i05` + registro
  no `test:integration`).
- **Fora de escopo**: nenhuma mudança no PWA (o backend já filtra por role) e no
  `frontend_admin` (change próprio da componente).