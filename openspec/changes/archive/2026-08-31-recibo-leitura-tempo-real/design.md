## Context

O detail-view de analytics (`frontend_admin/src/features/analytics/detail-view.js`) busca
`getPost(id)` e `getInteractionMembers(id)` **uma única vez** em `render()` e monta o HTML
(`root.innerHTML`) com o cabeçalho (título, totais de leituras/curtidas), o filtro de grupo e a
tabela de membros. O `renderTable()` é acionado no mount e no `change` do filtro de grupo usando
a lista de membros capturada no closure. Não há nenhum mecanismo de atualização. Ver proposal.md
— Why; requisitos em specs/recibo-leitura-tempo-real/spec.md.

No router (`src/app/router.js`), toda navegação reconstroi `app.innerHTML = shellHTML(...)` e
re-cria `#view` (`config.render(view, route)`), ou seja, o nó raiz **não sobrevive** entre rotas.
Portanto, um `setInterval` iniciado no detail-view precisa ser cancelado explicitamente ao sair.

## Goals / Non-Goals

**Goals:**
- Atualização automática da lista de quem leu/curtiu e dos totais (leituras/curtidas) **sem reload
  manual**, via polling client-side com intervalo ≤ 60s (será 30s).
- Preservar o `groupFilter` ativo e a seleção do dropdown entre refeshes.
- Cancelar o timer ao sair da rota (sem requisições/render em nós desmontados).
- Backend intocado: `GET /api/interactions/members` continua o mesmo (sem regressão).

**Non-Goals:**
- Sem SSE/WebSocket no backend (backend é outra componente; SSE é opcional na issue e não é
  necessário para atender aos critérios).
- Sem atualização do conjunto de opções do filtro de grupo (grupos que surgirem com novos membros
  durante a sessão não entram no dropdown — edge conhecido).
- Sem botão de "atualizar" manual (a atualização é automática).
- Sem alterações em `list-view.js`, PWA ou com cache/localStorage (re-busca sempre do backend).

## Decisions

### D1 — Polling client-side em vez de SSE/WebSocket
O mecanismo é **polling** (`setInterval`) re-buscando `getInteractionMembers(id)` — mesmo endpoint já
consumido. Alternativa descartada: SSE no backend (`EventSource` + `EventEmitter` notificando em
`PUT /api/interactions/:postId`). Motivos: atende ao critério ≤ 60s; zero mudança de backend; evita
complexidade de auth no `EventSource` (não envia `Authorization` header — exigiria token na query ou
cookie) e de CORS; menor risco de regressão. Backend é a outra componente (change próprio se um dia
houver SSE).

### D2 — Intervalo de 30s (POLL_INTERVAL_MS = 30000)
Constante `POLL_INTERVAL_MS = 30000` no detail-view. Alternativa: 60s exatos — risco de drift/timeout
do fetch empurrar o intervalo observado acima do critério de `≤ 60s`. 30s dá folga e uma sensação de
"tempo real" mais próxima do título da issue, mantendo custo baixo (1 requisição leve a cada 30s).

### D3 — Função `refreshMembers()` separada do `render()`
Extrair a re-busca + re-render para `refreshMembers()`, definida dentro do closure de `render()`
(captura `root`, `id` e a variável let `members`). Ela re-faz `getInteractionMembers(id)`, atualiza
os totais no `.metrics-summary` e chama `renderTable(root, members, empty)`, **preservando** o
`groupFilter` já em memória. O `render()` mantém a busca inicial (post + membros) e a montagem do HTML.
O handler de `change` do filtro continua usando `renderTable` com a lista `members` em memória.

### D4 — Atualização dos totais pelo `strong` do `.metrics-summary`
Os totais são derivados de `members`; no refresh, recomputar `totalReads`/`totalLikes` e escrever nos
dois `strong` dentro de `.metric-total` (`root.querySelectorAll(".metrics-summary .metric-total strong")`),
sem reconstruir o cabeçalho. Nenhum id novo é necessário — a ordem (leituras, curtidas) é estável.

### D5 — `stopPolling()` no router para cleanup de lifecycle
`let pollTimer = null;` no módulo do detail-view e `export function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }`.
O `renderRoute` do router chama `analyticsDetailView.stopPolling()` no topo, a cada navegação
(idempotente — limpar `null` é seguro). Como `#view` é reconstruído a cada rota, isto garante que o
intervalo do detail-view seja cancelado ao sair (detail → listagem/métricas/etc.) e ao re-entrar
(`render()` também chama `stopPolling()` no início). Alternativa descartada: registrar `hashchange`
dentro do módulo — duplicaria a lógica de rota já centralizada no router.

### D6 — Guarda contra falha transitória no refresh
`getInteractionMembers` retorna `[]` também quando o backend responde erro (a camada de dados abstrai
isso). Para não "limpar" a tabela por um erro/nova efêmera, `refreshMembers()` mantém a lista anterior
(`members`) quando a nova vem **vazia** e a anterior não estava vazia. A re-busca seguinte (30s) recupera.
Trade-off: um caso real de lista ficar vazia (sem interações) não existe na prática, pois o comunicado
mantém suas interações em `MongoDB`; o cenário "some tudo" não é atingível neste domínio.

### D7 — Sem mudança de contrato na camada de dados
Reusa `getInteractionMembers(id)` de `src/data/posts.js` sem alterar assinatura nem retorno (a guarda
é feita no detail-view, D6). Nenhuma mudança em `router.js` além da chamada a `stopPolling()`.

## Risks / Trade-offs

- **[Timer continua após sair da rota]** → `stopPolling()` idempotente no `renderRoute` + `render()`.
  O `#view` é recriado a cada navegação; como o timer referencia `root` do detail, ele é cancelado
  antes de qualquer uso de nó desmontado.
- **[Throttling de abas em segundo plano]** → navegadores pausam timers de abas inativas; quando o
  admin volta à aba, o polling retoma. O critério `≤ 60s` vale com a tela em primeiro plano; a folga
  de 30s (D2) reduz a chance de estourar o limite percebido.
- **[Falha de rede durante o polling]** → `members` anterior é mantido quando a nova lista vem vazia
  (D6), evitando piscar a tabela para vazio; recupera na próxima interação.
- **[Grupo novo não aparece no dropdown]** → edge conhecido, marcado como non-goal; o filtro continua
  válido para os grupos já carregados.

## Migration Plan

- Sem migração de dados. A implementação é frontend-only em `detail-view.js` (+ 1 linha em `router.js`).
- Rollback: remover o `setInterval`/`stopPolling` e a chamada no router — volta ao comportamento
  de buscar uma única vez, sem efeito residual (o backend não muda).
- Verificação: `npm run build` no frontend_admin + QA visual em `:5174` conforme tasks.md.

## Open Questions

- Nenhuma.
