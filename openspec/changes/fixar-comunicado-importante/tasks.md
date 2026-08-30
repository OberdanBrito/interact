## 1. Indicador visual de fixado

- [x] 1.1 Em `src/features/feed/templates.js`, adicionar o selo "Fixado" (classe `badge badge-pinned`, ícone pin) na `post-meta-row` do `postCardHTML`, antes do selo de urgente, quando `post.pinned === true`
- [x] 1.2 Adicionar estilo `.badge-pinned` em `styles.css` no padrão dos `.badge-*` existentes

## 2. Ordenação pinned primeiro

- [x] 2.1 Em `src/features/feed/feed.js`, inserir o pin como primeira chave do comparador `sortFeed` (`a.pinned !== b.pinned → a.pinned ? -1 : 1`), antes da lógica de urgência
- [x] 2.2 Confirmar que `visiblePosts()` mantém `sortByDate` na visão "Arquivo" (pin não altera a ordem do arquivo — I-12)

## 3. QA visual (portão Fase 5 — a executar no apply)

- [x] 3.1 Validar no Playwright :5173 que o card do comunicado fixado exibe "Fixado" e aparece no topo do feed "Ativos" mesmo com urgente não-fixado; "Arquivo" continua por data