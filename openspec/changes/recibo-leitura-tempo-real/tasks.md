## 1. Polling no detail-view de analytics

- [x] 1.1 Adicionar em `src/features/analytics/detail-view.js` a constante `POLL_INTERVAL_MS = 30000` e a variável de módulo `let pollTimer = null` — verificar que ambos estão declarados no topo do arquivo
- [x] 1.2 Extrair `refreshMembers()` dentro de `render()` que re-faz `getInteractionMembers(id)`, atualiza os totais (`.metrics-summary .metric-total strong`, recomputando `totalReads`/`totalLikes`) e chama `renderTable(root, members, empty)`, preservando o `groupFilter` ativo — verificar re-busca no Network e re-render da tabela
- [x] 1.3 Iniciar o ciclo ao final de `render()`: `pollTimer = setInterval(refreshMembers, POLL_INTERVAL_MS)` — verificar requisição a `GET /api/interactions/members` disparando a cada ~30s
- [x] 1.4 Aplicar a guarda de falha transitória (D6): em `refreshMembers`, manter a lista anterior quando a nova vier vazia e a anterior não estava vazia — verificar que uma resposta vazia não limpa a tabela
- [x] 1.5 Exportar `stopPolling()` (`if (pollTimer) clearInterval(pollTimer); pollTimer = null;`) e chamá-lo no início de `render()` (idempotente em re-entrada) — verificar função exportada e cancelamento no re-render

## 2. Cleanup de lifecycle no router

- [x] 2.1 Em `src/app/router.js`, chamar `analyticsDetailView.stopPolling()` no topo de `renderRoute()` (a cada navegação) — verificar que sair do detail para outra rota limpa o timer (sem novas requisições após a saída)

## 3. Verificação (portões do apply)

- [x] 3.1 Rodar `npm run build` no `frontend_admin` — build do Vite conclui sem erros (portão Fase 4)
- [x] 3.2 QA visual em `:5174` (a executar no apply): abrir "Detalhes de leitura" de um comunicado, simular leitura/curtida pelo colaborador (frontend_pwa `:5173` ou via curl) e confirmar que a lista e os totais atualizam sem reload em ≤ 30s; navegar para a listagem de métricas e confirmar que não há mais requisições de polling nem erro no console
