## Context

O backend já suporta busca via `?search=` em `GET /api/posts` (regex em `title` e
`author.name`) — ver `backend/src/routes/posts.js` (`new RegExp(escapeRegExp(search), "i")`
sobre `{ $or: [{ title: rx }, { "author.name": rx }] }`). O PWA nunca envia este parâmetro.
Hoje `frontend_pwa/src/data/posts.js#getPosts(groupId, { archive })` monta a URL só com
`groupId` e `archive`; `feed.js#visiblePosts()` busca os posts e aplica apenas o filtro de
categoria client-side. Não há campo de busca na `index.html`.

## Goals / Non-Goals

**Goals:**
- Expor um campo de busca no feed e propagar o termo à API via `?search=`, combinando com
  `?groupId=` (ambiente), `?category=` e `?archive=` quando presentes.
- Manter a busca funcional offline, caindo para o cache do IndexedDB (filtro local).
- Manter o mecanismo de busca centralizado na camada de dados (`data/posts.js`), reutilizando a
  visibilidade já implementada (`isPostVisibleToUser` / `filterCachedByGroup`).

**Non-Goals:**
- Alterar o backend (a rota já suporta `?search=`).
- Indexar conteúdo do corpo do comunicado (só título e autor, espelhando o backend).
- Busca no frontend_admin (fora do escopo da issue I-09).
- Ordenação diferenciada dos resultados (mantém a ordenação inteligente / data desc da aba).

## Decisions

### 1. Estado de busca no `state` global
Adicionar `search: ""` ao `state` em `frontend_pwa/src/core/state.js`, usado por
`feed.js` (dono) e lido por `visiblePosts()`. Alternativa (variável local em `feed.js`) foi
rejeitada por consistência com os demais danos de filtro (`filter`, `activeGroupId`,
`archive`) já centralizados no estado.

### 2. `getPosts` recebe o termo de busca
Evoluir `getPosts(groupId, { archive, search } = {})` para acrescentar
`search=<termo>` (encodeURIComponent) aos params quando presente, permitindo composição
`?groupId=X&archive=Y&search=Z`. Parâmetro mantido opcional para não quebrar os call-sites
existentes (ex.: `getPostByIdAsync` não depende dele).

### 3. Busca offline filtrada localmente a partir da Baseline já carregada
Em `filterCachedByGroup(groupId, archive, search)`, após a filtragem de visibilidade/ambiente/aba,
aplicar um filtro de texto case-insensitive em `title` e `author.name`
(`String(p.title).toLowerCase().includes(q)`). Reimplementa o mesmo critério server-side para
o cache — aceitável pois é uma heurística de apresentação offline, e o critério online é sempre
a fonte de verdade (índice/regex no backend). Alternativa de adicionar uma indexação de busca no
Dexie foi descartada (complexidade sem ganho para o volume atual).

### 4. Debounce na digitação
Debounce (~250–300ms) no handler do input para não disparar uma requisição por tecla; a busca
relativa a `renderFeed()` é reexecutada com `state.search`. O valor é reutilizado também no
fallback offline (não há nova IDB query por tecla, apenas re-render).

### 5. Estado vazio de busca
Distinguir o estado vazio: quando `state.search` não vazio e sem resultados, usar a mensagem
"Nenhum comunicado encontrado para a busca", sem alterar o empty padrão de categoria. Implementado
em `renderFeed()` ajustando `#empty-title`/`#empty-sub` com base em `state.search`.

### 6. Campo de busca na `index.html`
Adicionar um `<input type="search">` (ou campo de busca com ícone) no header do feed,
adjacente ao seletor de ambiente, com `id="search-input"` e `aria-label` adequado. O handler é
instalado em `feed.js`. Reutiliza o CSS de chips/toolbar existente; sem novo componente.

## Risks / Trade-offs

- **[Parâmetros combinados geram URLs longas]** → `encodeURIComponent` já é usado; o backend
  aceita múltiplos query params. Sem risco funcional.
- **[Busca offline pode divergir do critério server-side]** → Aceitável (heurística de
  apresentação); online permanece fonte de verdade. Documentado na decisão 3.
- **[Debounce atrasa levemente a resposta]** → 250–300ms é imperceptível e evita excesso de
  chamadas; mitigação: `input` já dispara re-render imediato do fallback offline.
- **[Re-render do feed em cada tecla]** → `renderFeed()` é assíncrono e leve; o debounce reduz a
  frequência. Sem risco de thrash perceptível.

## Migration Plan

Adição não-destrutiva: novo campo de busca opcional, `getPosts` evoluído de forma retrocompatível.
Deploy: commit na branch `frontend_pwa` (worktree `frontend_pwa`), build via `npm run build`.
Rollback: reverter o commit (nenhuma migração de dados necessária; voltar ao PWA sem o campo
de busca).

## Open Questions

Nenhuma — a issue define escopo claro (UI de busca no PWA, backend já pronto) e as decisões
acima fecham os únicos pontos de escolha (estado, camada de dados, debounce, empty state).
