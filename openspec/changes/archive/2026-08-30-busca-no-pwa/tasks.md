## 1. Estado e camada de dados

- [x] 1.1 Adicionar `search: ""` ao objeto `state` em `frontend_pwa/src/core/state.js` e verificar que o campo existe após import
- [x] 1.2 Evoluir `getPosts(groupId, { archive, search } = {})` em `frontend_pwa/src/data/posts.js` para incluir `search` (com `encodeURIComponent`) na query string quando presente, mantendo `groupId` e `archive`; verificar com `node --check src/data/posts.js` que não há erro de sintaxe e inspecionar que `?search=` aparece na URL construída
- [x] 1.3 Evoluir `filterCachedByGroup(groupId, archive, search)` para aplicar filtro local case-insensitive em `title` e `author.name`, após a filtragem de visibilidade/ambiente/aba; verificar por `node --check` e revisar que a assinatura é chamada a partir de `getPosts` com o termo em busca offline

## 2. UI do campo de busca no feed

- [x] 2.1 Adicionar o campo de busca (`<input type="search">`) no header do feed em `frontend_pwa/index.html` (junto ao `#env-selector`), com `id="search-input"` e `aria-label` descritivo; verificar que o elemento existe na DOM renderizada
- [x] 2.2 Instalar handler no input em `frontend_pwa/src/features/feed/feed.js` com debounce (~250–300ms) que atualiza `state.search` e chama `renderFeed()`; verificar em `node --check` e revisar que a ligação ocorre após o feed estar visível

## 3. Renderização do feed com busca e estado vazio

- [x] 3.1 Atualizar `visiblePosts()` em `frontend_pwa/src/features/feed/feed.js` para passar `search: state.search` a `getPosts`, mantendo a ordenação inteligente / data desc da aba; verificar `node --check` e revisar que nenhum call-site existente quebra (parâmetro opcional)
- [x] 3.2 Ajustar o estado vazio em `renderFeed()` para exibir "Nenhum comunicado encontrado para a busca" quando `state.search` não vazio e não houver resultados, mantendo o empty padrão de categoria quando a busca está vazia; verificar em `node --check` e revisar a lógica condicional

## 4. Validação

- [x] 4.1 Rodar `npm run build` no `frontend_pwa` e verificar que compila sem erros
- [x] 4.2 Validar visualmente no navegador (Playwright `:5173`): digitar termo de busca filtra por título/autor, respeita seletor de ambiente e aba, exibe estado vazio quando sem resultados; capturar screenshots em `/tmp/opencode/`
- [x] 4.3 Validar cenário offline: desligar rede, digitar termo de busca e confirmar que a busca cai para o cache do IndexedDB (não quebra)
