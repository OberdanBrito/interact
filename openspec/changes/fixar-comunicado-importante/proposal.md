## Why

Comunicados importantes se perdem no meio do feed do colaborador, mesmo com a ordenação
inteligente. Fixar (pin) um comunicado no topo garante visibilidade a uma comunicação
prioritária independente de urgência, data ou estado de leitura.

## What Changes

- Model `Comunicado` ganha o campo `pinned: Boolean` (default `false`), opcional.
- `toPost` passa a expor `pinned` no payload (admin e colaborador).
- `GET /api/posts` ordena **pinned primeiro**, depois por `dateISO` desc (múltiplos pinned
  ordenados por recência) — vale para o feed do colaborador e para a listagem do admin.
- `PUT /api/posts/:id` aceita `pinned` (boolean): fixa/desfixa comunicados já **publicados**;
  tentar fixar rascunho/agendado é rejeitado com `400` ("Apenas comunicados publicados podem
  ser fixados").
- `POST /api/posts` não é alterado (pin é ação pós-publicação, feita pela listagem).

## Capabilities

### New Capabilities

_(nenhuma)_

### Modified Capabilities

- `comunicados`: ganha o requisito de `pinned` — persistência, exposição no payload,
  ordenação pinned-primeiro no GET e validação de pin somente em publicados no PUT.

## Impact

- `backend/src/models/Comunicado.js` — novo campo `pinned`.
- `backend/src/routes/posts.js` — `toPost`, ordenação do GET e tratamento de `pinned` no PUT.
- Contrato da API `GET/PUT /api/posts` ampliado (campo novo, sem quebra — `pinned` ausente em
  clientes antigos é ignorado).
- Teste de integração versionado em `backend/scripts/qa-i04.mjs`.