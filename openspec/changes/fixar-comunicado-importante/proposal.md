## Why

O colaborador precisa ver no topo do feed o comunicado que o admin fixou. Hoje o feed só
ordena por urgência → não-lidos → recência (ordenação inteligente), sem noção de fixado.

## What Changes

- O card do comunicado exibe o indicador visual **"Fixado"** quando `pinned === true`
  (selo independente do selo de urgente).
- `sortFeed` (visão "Ativos") passa a ordenar **pinned primeiro** — pinned vence urgente;
  múltiplos pinned ordenados por `dateISO` desc; os demais seguem a ordenação inteligente
  atual (urgente → não-lidos → recentes).
- A visão "Arquivo" (I-12) mantém a ordenação por data desc (`sortByDate`); pin não altera a
  ordenação do arquivo — apenas exibe o selo se o post for fixado.
- Cache offline (Dexie) e `getPosts` já propagam o campo `pinned` do payload — sem mudança
  de contrato de dados.

## Capabilities

### New Capabilities

_(nenhuma)_

### Modified Capabilities

- `interacoes-colaborador`: ganha os requisitos de indicador visual de fixado e de pin
  vencendo a ordenação inteligente na visão "Ativos".

## Impact

- `frontend_pwa/src/features/feed/feed.js` — `sortFeed` (pin-primeiro) mantendo `sortByDate`
  no arquivo.
- `frontend_pwa/src/features/feed/templates.js` — selo "Fixado" no `postCardHTML`.
- `frontend_pwa/styles.css` — estilo do selo fixado (reuso de classes quando possível).