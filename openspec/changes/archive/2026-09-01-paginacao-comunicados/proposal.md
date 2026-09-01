## Why

A listagem de comunicados do painel admin carrega todos os comunicados de uma vez. Com o volume
crescendo, a listagem não escala e a experiência de carregar tudo de uma vez piora. Adicionar
paginação simples (sem a ordenação inteligente, que é exclusiva do feed do colaborador) permite
carregar a lista em blocos, mantendo os filtros existentes.

## What Changes

- `list-view.js` do admin passa a **paginizar client-side** a lista já carregada de `GET /api/posts`
  (a listagem é limitada aos comunicados do próprio admin via `createdBy`, tipicamente pequena),
  sem depender de paginação server-side para o admin.
- Adiciona estado de página (`state.page`/`state.pageSize`) e controles de navegação
  (Anterior/Próxima + indicador "Página X de Y"), renderizados quando a lista excede o tamanho de
  página.
- Cada mudança de filtro (busca ou categoria) reseta para a primeira página; a paginação opera
  sobre o filtrado (`filterPosts`), não sobre o conjunto bruto.
- Mantém os filtros atuais (categoria + busca por título) e a contagem de comunicados/rascunhos
  independente da página (total antes do corte). Sem ordenação inteligente por urgente/não-lido
  (exclusiva do PWA).

## Capabilities

### New Capabilities
- `paginacao-comunicados`: paginação da listagem de comunicados no painel admin, com controles de
  navegação por página e preservação dos filtros existentes.

### Modified Capabilities
- (vazio — o comportamento de gestão de comunicados existente continua; a paginação é adicionada
  como novo capability.)

## Impact

- **frontend_admin**: `src/features/posts/list-view.js` (adicionar estado de página, slice do array
  filtrado, controles de paginação, resetar página ao mudar filtro), `src/core/state.js`
  (`state.page`, `state.pageSize`).
- **backend**: sem mudança para o admin — a listagem continua consumindo o array simples de
  `GET /api/posts` (a rota passa a retornar envelope apenas quando `?limit`/`?cursor` for enviado;
  o admin não envia, então segue com o array).
- Nenhuma mudança de dependência; sem breaking de contrato.
