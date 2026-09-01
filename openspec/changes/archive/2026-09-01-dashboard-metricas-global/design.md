## Context

O painel admin é Vite vanilla JS com roteamento por hash (`src/app/router.js` → `AUTH_ROUTES`)
e uma camada de dados em `src/data/` (`posts.js`, `groups.js`) que faz `fetch` com `Bearer
token`. A feature de analytics hoje é `src/features/analytics/` (list-view + detail-view) e a
navegação é montada em `src/ui/templates.js` (`sidebar-nav`). O backend entrega o recorte via
`GET /api/interactions/summary?desde&ate&groupId` (change irmã do backend — veja proposal).
O summary responde `{ [postId]: { reads, likes } }` e o admin já consome a forma sem filtros
em `data/posts.js::getInteractionsSummary()`.

## Goals / Non-Goals

**Goals:**
- Adicionar uma tela de dashboard global com cards (total, % lido, % curtido, por grupo),
  ranking de mais/menos lidos e filtros de período/grupo.
- Reutilizar o contrato do summary com os novos filtros, sem duplicar agregação no frontend.
- Preservar a tela "Leituras" (`#/analytics`) e o detalhe por comunicado atuais.

**Non-Goals:**
- Não alterar tabela do dashboard de leituras existente nem o fluxo de engajamento por
  comunicado.
- Não implementar agregação client-side como fonte de verdade (o backend agrega; o frontend só
  consome e calcula percentuais/ranking).
- Não introduzir gráficos (charts) — o escopo é cards + ranking (sem libs novas).

## Decisions

- **Nova rota dedicada `#/dashboard`** em vez de substituir `#/analytics`: a tela atual de
  leituras por comunicado é preservada e o dashboard global ganha seu próprio endereço e item
  de navegação. Alternativa considerada (transformar `#/analytics` no dashboard com um link
  para a listagem por comunicado) mudaria o fluxo existente e o destaque do menu; rejeitada
  para minimizar impacto.
- **Regra no router**: adicionar `dashboard` a `parseRoute` (`parts[0] === "dashboard"`) e um
  `dashboard: { title: "Dashboard", active: "dashboard", render: ... }` em `AUTH_ROUTES`.
- **Item de navegação** em `src/ui/templates.js::shellHTML` (novo `<a class="nav-item">` com
  `active === "dashboard"`), junto aos itens existentes.
- **Chamada com filtros**: criar `getInteractionsSummary({ desde, ate, groupId } = {})` (ou uma
  função irmã) em `data/posts.js`, montando a query string opcional no summary. A assinatura
  atual sem argumentos continua válida (retorna `{}` sem token / sem filtro).
- **Cálculo de percentuais e ranking no frontend**: o summary retorna contagens por `postId`;
  o dashboard combina com a lista de posts (`listPosts()`) para obter metadados (título) e
  calcular %s. Comunicado sem entrada no summary → `reads: 0, likes: 0`.
- **Filtro de grupo**: usar `data/groups.js::listGroups()` para popular o `<select>` de grupo
  (opção "Todos os grupos" + grupos ativos). Reaplicar filtro → refetch do summary com os
  parâmetros.
- **Sem `null`**: a camada de dados já normaliza para `0` quando o post não tem interação;
  a view aplica `?? 0` defensivamente.

## Risks / Trade-offs

- [Dois consumidores do summary (list-view e dashboard) poderiam divergir na leitura do
  formato] → Mitigação: manter a mesma função de leitura `getInteractionsSummary` e apenas
  estendê-la com parâmetros opcionais; o formato `{ [postId]: { reads, likes } }` é estável.
- [Filtro de grupo no front end exige a lista de grupos; se a chamada falhar, o select fica
  vazio] → Mitigação: fallback para "Todos os grupos" e estado vazio/erro amigável sem quebrar o
  render.
- [Cálculo de % lido/curtido por grupo não é fornecido diretamente pelo summary em grupo
  único] → Mitigação: para o desdobramento por grupo, o dashboard re-renderiza o summary com
  `groupId` para cada recorte, mantendo o backend como fonte de verdade.
