## Why

Colaboradores não têm como encontrar um comunicado específico no feed — quanto mais posts
publicados, mais difícil achar uma informação relevante por título ou autor. O backend já
oferece suporte (`GET /api/posts?search=`, regex em `title` e `author.name`), mas o PWA
nunca expõe essa capacidade. Falta apenas a camada de busca na UI do colaborador (I-09).

## What Changes

- Adicionar um campo de busca no feed do colaborador; ao digitar, o feed filtra por título
  e autor via `?search=`.
- Fazer a busca respeitar a visibilidade por grupo e o seletor de ambiente ativo
  (`?groupId=`), combinando com `?search=`.
- Fazer a busca combinar com os filtros já existentes (categoria via `?category=` e aba
  Ativos/Arquivo via `?archive=`), sem quebrar nenhum.
- Em modo offline, a busca cai para o cache do IndexedDB (filtro local sobre os posts
  visíveis cacheados), mantendo a experiência sem conexão.
- Exibir estado vazio condizente quando a busca não retorna resultados (ex.: "Nenhum
  comunicado encontrado para a busca").

Não há mudança no backend (a rota `GET /api/posts` já suporta `?search=`). Esta alteração é
frontend only, no `frontend_pwa`.

## Capabilities

### New Capabilities
- `busca-feed`: Busca de comunicados por título/autor no feed do colaborador, com um campo
  de busca que filtra via `?search=` (combinando com visibilidade por grupo, ambiente,
  categoria e aba Ativos/Arquivo) e cai para o cache offline (IndexedDB) quando sem conexão.

### Modified Capabilities
<!-- Nenhuma capability existente tem requisito alterado neste change: a busca é uma
     capacidade nova no PWA; o comportamento do feed propriamente dito não muda. -->

## Impact

- **Código afetado**: `frontend_pwa/src/features/feed/feed.js` (estado de busca, renderização
  do feed com filtro), `frontend_pwa/src/features/feed/templates.js` (se houver campo na UI),
  `frontend_pwa/src/data/posts.js` (`getPosts` passa a aceitar `search` e a combinar os
  parâmetros `?search=`, `?category=`, `?groupId=`, `?archive=`), `frontend_pwa/index.html`
  (elemento do campo de busca), `frontend_pwa/src/core/state.js` (novo campo `search` no
  estado do app).
- **APIs**: usa `GET /api/posts?search=<termo>` (já existente no backend, sem alteração).
- **Dependências**: nenhuma nova; reutiliza o cache Dexie existente para o fallback offline.
- **Sistemas**: colaborador (frontend_pwa). Admin/backend não são afetados.
