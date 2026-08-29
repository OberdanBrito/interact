## Why

Hoje o feed do colaborador (PWA) lista **todos** os comunicados publicados na mesma lista, sem
distinção de idade — comunicados antigos competem com os recentes e poluem a experiência de
leitura. A I-12 separa comunicados ativos dos antigos com uma aba "Arquivo", mantendo o feed
principal enxuto e a ordenação inteligente intacta.

## What Changes

- **PWA (colaborador)** — aba/toggle "Ativos | Arquivo" no feed:
  - visão "Ativos" (padrão) pede `archive=active` à API e mantém a ordenação inteligente
    (urgentes → não-lidos → recentes) apenas sobre os comunicados recentes;
  - visão "Arquivo" pede `archive=archived` e lista os antigos ordenados por data (mais recente
    primeiro);
  - busca (`?search`) e visibilidade (`?groupId`) continuam funcionando dentro do arquivo
    (suportadas na API; o PWA hoje não tem UI de busca — satisfeito no nível da API).
- **Backend** — `GET /api/posts` ganha filtro opcional `?archive=active|archived` (colaborador):
  define o corte de idade (30 dias) e retorna só o recorte pedido; sem o parâmetro, tudo
  preservado. Admin ignora o parâmetro.

## Capabilities

### New Capabilities
<!-- Nenhuma capability nova; o feed existente é estendido. -->

### Modified Capabilities
- `interacoes-colaborador`: o feed do colaborador passa a separar a listagem em duas visões —
  "Ativos" (padrão, somente recentes, ordenação inteligente mantida) e "Arquivo" (comunicados
  antigos), acessíveis por aba/toggle; busca e visibilidade continuam valendo dentro do arquivo.

## Impact

- **PWA**: `src/data/posts.js` (getPosts com suporte a `archive`), `src/features/feed/feed.js`
  (estado da visão + aba/toggle + render), `index.html` (container da aba), `styles.css`
  (estilo da aba). Interações (curtir/ler) e cache offline não mudam de mecânica.
- **Backend**: `src/routes/posts.js` (GET /api/posts — filtro `?archive` + constante
  `ARCHIVE_AFTER_DAYS`). Sem mudança de schema (Mongo). Sem quebra de API existente.
- **Fora de escopo**: nenhuma mudança em `frontend_admin`; arquivamento manual; notificações.