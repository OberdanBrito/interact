## Why

O painel "Detalhes de leitura" (`frontend_admin` → `features/analytics/detail-view`) mostra a lista de
quem leu/curtiu cada comunicado, mas essa lista é buscada **uma única vez** quando a tela abre —
não reflete ações que acontecem enquanto o admin está navegando. Resultado: para ver um novo leitor
ou curtida, o admin precisa recarregar a página, o que contradiz a expectativa de "tempo real" e
esconde dados vivos do feed dos colaboradores.

## What Changes

- O detail-view de analytics passa a **atualizar automaticamente** a lista de quem leu/curtiu via
  **polling client-side** (`setInterval`): re-busca `GET /api/interactions/members?postId=...` a cada
  ≤ 60s e re-renderiza a tabela + os totais (leituras/curtidas) **sem reload manual**.
- O timer de polling é **cancelado ao sair da rota** (`stopPolling()` chamado no `renderRoute` do
  router), evitando requisições/render em nós desmontados e vazamento de memória.
- O filtro de grupo (`groupFilter`) e a opção selecionada são **preservados** entre refeshes da tabela.
- Backend **intocado**: nenhum endpoint novo; `GET /api/interactions/members` continua exatamente o
  mesmo (sem regressão — critério de aceite da issue).

## Capabilities

### New Capabilities

- `recibo-leitura-tempo-real`: capabilidade do painel admin de exibir o recibo de leitura individual
  por comunicado (quem leu/curtiu) com atualização automática via polling (≤ 60s), sem reload manual,
  preservando o filtro de grupo e cancelando o ciclo ao sair da rota.

### Modified Capabilities

_(nenhuma — nenhuma capability existente tem requisito alterado; a feature de analytics ainda não
possuía spec próprio em `openspec/specs/`)_

## Impact

- `frontend_admin/src/features/analytics/detail-view.js` — polling com `POLL_INTERVAL_MS = 30000`,
  extração de `refreshMembers()` (re-fetch de `getInteractionMembers(id)` + re-render de tabela e
  totais), e `stopPolling()` para cancelar o timer.
- `frontend_admin/src/app/router.js` — invocar `analyticsDetailView.stopPolling()` em `renderRoute`
  (cleanup de lifecycle a cada navegação).
- `frontend_admin/src/data/posts.js` — **sem mudança de contrato** (reusa `getInteractionMembers`).
- **Fora de escopo**: nenhuma mudança em `backend` (change próprio), no PWA (`frontend_pwa`) nem em
  `GET /api/interactions/members`.
