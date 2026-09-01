## 1. Camada de dados

- [x] 1.1 Em `src/data/posts.js`, permitir que `getInteractionsSummary` aceite um objeto de
      filtros opcionais `{ desde, ate, groupId }`, montando a query string (`?desde=…&ate=…&groupId=…`)
      apenas com os parâmetros presentes; sem filtro, manter a chamada atual — verificar que a
      assinatura sem argumentos continua retornando o mesmo formato `{ [postId]: { reads, likes } }`.

## 2. View do dashboard

- [x] 2.1 Criar `src/features/analytics/dashboard-view.js`, que carrega `listPosts()`,
      `getInteractionsSummary(...)` e `listGroups()` e renderiza:
      cards de total de comunicados, % lido e % curtido (global e por grupo), com `?? 0` para
      comunicados sem interação — verificar renderizando a tela com dados do backend.
- [x] 2.2 Renderizar o ranking de comunicados mais/menos lidos, ordenando pelo número de
      leituras do recorte, exibindo título e `reads`/`likes` — verificar a ordem desc de
      leituras no DOM.
- [x] 2.3 Adicionar os controles de filtro de período (`desde`/`ate`, inputs de data) e de grupo
      (`<select>` com "Todos os grupos" + grupos ativos), refazendo o fetch do summary com os
      parâmetros ao mudar — verificar que mudar o filtro recalcula cards e ranking.

## 3. Rota e navegação

- [x] 3.1 Em `src/app/router.js`, adicionar a rota `#/dashboard` em `parseRoute` e um
      `dashboard` em `AUTH_ROUTES` chamando a nova view — verificar que `#/dashboard` renderiza o
      dashboard e `#/analytics` continua renderizando a listagem atual.
- [x] 3.2 Em `src/ui/templates.js`, adicionar o item de navegação do dashboard no `sidebar-nav`
      com destaque ativo (`active === "dashboard"`) — verificar o destaque no menu.

## 4. Verificação

- [x] 4.1 Rodar `npm run build` no frontend_admin sem erros.
- [x] 4.2 QA visual (Playwright) no fluxo real: abrir `#/dashboard` no admin, aplicar filtro de
      período e de grupo, conferir cards/ranking — capturar screenshot em `/tmp/opencode/`.
