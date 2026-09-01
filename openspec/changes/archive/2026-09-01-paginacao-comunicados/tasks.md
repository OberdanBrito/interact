## 1. Estado de paginação

- [x] 1.1 Adicionar `state.page = 1` e uma constante `PAGE_SIZE` (ex.: 20) em `src/core/state.js` e
      verificar que os valores são exportados/importados corretamente

## 2. Cortar a lista filtrada em páginas

- [x] 2.1 Em `src/features/posts/list-view.js`, ajustar `renderRows` para renderizar apenas
      `filtered.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE)` e validar que a primeira
      página mostra até `PAGE_SIZE` linhas
- [x] 2.2 Manter a contagem de comunicados/rascunhos usando o total (antes do corte) e o estado vazio
      existente; validar que mudar de página não altera o contador

## 3. Controles de paginação

- [x] 3.1 Montar `PAGE_SIZE`/`<nav class="pagination">` em `render()` e exibir/atualizar por
      `renderRows` apenas quando `Math.ceil(filtered.length / PAGE_SIZE) > 1` com o indicador
      "Página X de Y" — validar que some quando tudo cabe em uma página
- [x] 3.2 Implementar handlers de "Anterior"/"Próxima" que decrementam/incrementam `state.page`
      (desabilitados nos limites) e re-renderizam a tabela

## 4. Resetar página ao mudar filtro

- [x] 4.1 Nos handlers de busca (input) e categoria (change), setar `state.page = 1` antes de
      `renderRows` — validar que filtrar volta para a página 1
- [x] 4.2 Garantir que `state.page` nunca ultrapassa o número de páginas (clamp após filtro/paginação)

## 5. Verificação final

- [x] 5.1 Rodar `npm run build` no frontend_admin e validar via QA (listagem > `PAGE_SIZE`, navegar
      páginas, filtros resetam a página, contador estável)
