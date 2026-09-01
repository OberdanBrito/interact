## Why

Hoje o admin enxerga as métricas de leitura/curtida comunicado a comunicado (tela "Leituras" em
`#/analytics` + detalhes por comunicado). Falta uma visão geral consolidada: total de comunicados,
% lido, % curtido e desdobramento por grupo, com recorte de período — o que a issue I-13 chama de
**Dashboard global de métricas**.

## What Changes

- Nova tela de dashboard no admin (`frontend_admin`), consolidando indicadores globais:
  - cards com total de comunicados, % lido e % curtido (global e por grupo).
  - ranking de comunicados mais/menos lidos.
  - filtro por período (`desde`/`ate`) e por grupo.
- A tela consome o endpoint `GET /api/interactions/summary` (backend) com os novos filtros
  `desde`/`ate`/`groupId`, lançado em conjunto nesta mesma issue.
- Comunicados sem interações no recorte renderizam **0** leituras/curtidas (nunca `null`).
- Não é **BREAKING**: a tela atual "Leituras" (`#/analytics`) e o detalhe por comunicado são
  preservados.

## Capabilities

### New Capabilities

- `dashboard-metricas-global`: tela de dashboard global de métricas no painel administrativo —
  indicadores consolidados, ranking de comunicados e filtros de período/grupo.

### Modified Capabilities

_(nenhuma capacidade existente muda de requisito; a tela "Leituras" e o detalhe por comunicado
continuam com o comportamento atual)_

## Impact

- `frontend_admin/src/features/analytics/` — nova view de dashboard (subsistema de analytics).
- `frontend_admin/src/data/posts.js` — função para chamar o `summary` com filtros opcionais.
- `frontend_admin/src/app/router.js` — registro da nova rota do dashboard no shell de navegação.
- `frontend_admin/src/ui/templates.js` — item de navegação (se o dashboard for a entrada nova).
- Contrato compartilhado com o backend `GET /api/interactions/summary` (filtros `desde`/`ate`/
  `groupId`).
