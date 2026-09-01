## Context

Ver proposal.md - Why. Estado atual: `list-view.js` `renderRows(root)` (`17-57`) chama `listPosts()`
(`src/data/posts.js:51-59`) que busca `GET /api/posts` sem parâmetros e retorna um array re-ordenado
por `dateISO` desc; `filterPosts(posts)` (`7-15`) filtra client-side por categoria e busca no título.
`render` (`141-197`) monta a tabela uma vez. `state` só tem `search` e `categoryFilter` — **não
existe** `page`/`pageSize`/`totalPosts` nem filtro por status. O contador (`renderRows`, `25-31`)
usa `posts.length` (total bruto) + contagem de rascunhos.

## Goals / Non-Goals

**Goals:**
- Paginação client-side da listagem do admin (cortar o conjunto filtrado em páginas).
- Controles Anterior/Próxima + indicador "Página X de Y" (renderizados só quando necessário).
- Preservar filtros (categoria + busca) e reiniciar a página na primeira página ao mudar filtro.
- Contador de comunicados/rascunhos independente da página (total antes do corte).

**Non-Goals:**
- Não adicionar paginação server-side no admin (a listagem é limitada a `createdBy` e tipicamente
  pequena — a paginação client-side basta).
- Não adicionar filtro por status/abas (não existe hoje; fora do escopo da I-10).
- Não usar ordenação inteligente (urgente/não-lido) no admin (exclusiva do PWA).
- Não alterar o backend nem a change `2026-09-01-paginacao-comunicados` (backend).

## Decisions

**D1 — Paginação client-side sobre o conjunto filtrado.** `filterPosts(posts)` retorna a lista
filtrada; `renderRows` corta `filtered.slice((page-1)*pageSize, page*pageSize)` e renderiza esse
recorte. `state.page = 1` e `state.pageSize = 20` (constante). Não há dependência de `limit`/`cursor`
no backend — o admin segue consumindo o array simples.

**D2 — Renderizar controles condicionalmente.** Os controles (`<nav class="pagination">`) são
montados dentro de `render()` (uma só vez, como a tabela) e preenchidos/exibidos por `renderRows`:
visível apenas quando `Math.ceil(filtered.length / pageSize) > 1`. O indicador exibe
"Página X de Y". Botões "Anterior"/"Próxima" desabilitados nos limites.

**D3 — Resetar página ao mudar filtro.** Os handlers existentes de `input` (search) e `change`
(select) passam a setar `state.page = 1` antes de `renderRows`. O contador de comunicados/rascunhos
continua usando `posts.length`/draftCount (bruto, antes do corte), e o estado vazio existente é
mantido.

**Alternativa considerada (D4) — Paginação server-side no admin:** rejeitada — exigiria
`limit`/`cursor` no backend e re-escrita de `listPosts`, sem ganho real para o volume atual
(comunicados do próprio admin); client-side é mais simples e suficiente.

## Risks / Trade-offs

- [Lista crescer muito no futuro] → barreira clara: se a listagem do admin escalar, migrar para
  server-side (Já previsto em D4 como evolve path), sem impacto no PWA.
- [Contador usar `posts.length` bruto vs filtrado] → manter o comportamento atual (total bruto +
  rascunhos), como hoje; o texto de "Nenhum resultado encontrado" continua sendo o estado vazio do
  filtro (não o da página).
- [Página atual inválida após filtro] → sempre resetar `page = 1` em qualquer mudança de filtro,
  garantindo `page` nunca exceder o número de páginas.

## Migration Plan

1. Adicionar `state.page`/`state.pageSize` e a lógica de corte em `renderRows`.
2. Montar e condicionar os controles de paginação em `render()`/`renderRows`.
3. Ligar reset de página nos handlers de search/categoria; validar com o backend no ar (sem
   mudanças no backend).

## Open Questions

- Nenhum que mude spec/approach/tasks.
