## Why

Hoje o feed do colaborador (PWA) lista **todos** os comunicados publicados na mesma lista, sem
distinção de idade — comunicados antigos competem com os recentes e poluem a experiência de
leitura. A I-12 separa comunicados ativos dos antigos com uma aba "Arquivo", mantendo o feed
principal enxuto e a ordenação inteligente intacta.

## What Changes

- **Backend** — `GET /api/posts` ganha filtro opcional `?archive=active|archived` (não admin):
  - `archive=active` → somente comunicados publicados há menos de `ARCHIVE_AFTER_DAYS` (30, env-overridable);
  - `archive=archived` → somente comunicados publicados há `ARCHIVE_AFTER_DAYS` ou mais;
  - sem o parâmetro, comportamento atual preservado (retorna tudo) — **sem quebra**; admin ignora o parâmetro.
- **PWA (colaborador)** — aba/toggle "Ativos | Arquivo" no feed:
  - visão "Ativos" pede `archive=active` e mantém a ordenação inteligente (urgentes → não-lidos → recentes) apenas sobre os recentes;
  - visão "Arquivo" pede `archive=archived` e lista ordenada por data (mais recente do grupo primeiro);
  - busca (`?search`) e visibilidade (`?groupId`) continuam funcionando dentro do arquivo (já suportadas na API; PWA hoje não tem UI de busca — satisfeito no nível da API).

## Capabilities

### New Capabilities
<!-- Nenhuma capability nova; comportamento de listagem existente é estendido. -->

### Modified Capabilities
- `comunicados`: GET /api/posts passa a aceitar o filtro opcional `?archive` (active/archived) para
  o colaborador, separando comunicados ativos de arquivados por idade; comportamento padrão
  preservado.
- `interacoes-colaborador`: o feed do colaborador passa a separar a listagem em duas visões —
  "Ativos" (padrão, somente recentes, ordenação inteligente mantida) e "Arquivo" (comunicados
  antigos), acessíveis por aba/toggle; busca e visibilidade continuam valendo dentro do arquivo.

## Impact

- **Backend**: `src/routes/posts.js` (GET /api/posts — filtro `?archive` + constante
  `ARCHIVE_AFTER_DAYS`). Sem mudança de schema (Mongo). Sem quebra de API existente.
- **PWA**: `src/data/posts.js` (getPosts com suporte a `archive`), `src/features/feed/feed.js`
  (estado da visão + aba/toggle + render), `index.html` (container da aba), `styles.css`
  (estilo da aba). Interações (curtir/ler) e cache offline não mudam de mecânica.
- **Fora de escopo**: nenhuma mudança em `frontend_admin`; arquivamento manual; notificações.