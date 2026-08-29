## Context

O feed do PWA (src/features/feed/feed.js) hoje busca **todos** os posts elegíveis
(`getPosts(groupId)` → `GET /api/posts[?groupId]`) e aplica a ordenação inteligente
(urgentes → não-lidos → recentes) sobre o conjunto completo. Chips de categoria e seletor de
ambiente (grupo) apenas re-renderizam o mesmo conjunto. Não há busca na UI. A I-12 separa a
listagem em duas visões — "Ativos" (recentes) e "Arquivo" (antigos, ≥ 30 dias), via aba/toggle —
usando o filtro `?archive` no backend (mesmo critério nos dois lados).

## Goals / Non-Goals

**Goals:**
- Aba/toggle "Ativos | Arquivo" que troca o recorte da listagem sem recarregar a página.
- Feed ativo com ordenação inteligente preservada, restrito aos comunicados ativos.
- Arquivo listando antigos por data (mais recente primeiro), respeitando grupo/categoria/busca.
- Interações (curtir, ler, marcar como não lido) intactas dentro do arquivo.

**Non-Goals:**
- Não criar UI de busca nova (o PWA não tem busca hoje; o critério é satisfeito no nível da API).
- Não persistir preferência da aba (sempre abre em "Ativos").
- Não mudar cache offline, fila de sincronização ou badge.

## Decisions

### D1 — Filtro no backend, não separação client-side
Decisão: o PWA pede `?archive=active|archived` à API em vez de filtrar `dateISO` localmente.
Racional: (a) o backend é a fonte de verdade do corte (constante `ARCHIVE_AFTER_DAYS`); (b)
payload menor conforme os comunicados envelhecem; (c) alinhado à issue ("backend — rota posts,
filtro opcional"). Trade-off: offline, o cache (Dexie) guarda o último recorte buscado; posts do
arquivo só ficam offline se a aba "Arquivo" foi aberta com conexão — aceitável e documentado.

### D2 — Estado `state.archive: "active" | "archived"` + aba reusa o padrão dos chips
Decisão: `renderFeed()` lê `state.archive` e chama `getPosts(groupId, { archive })`. A aba
"Ativos | Arquivo" usa o mesmo padrão visual dos chips existentes (`renderEnvSelector`/`renderChips`)
com `aria-pressed`. Alternativa: segunda linha de chips separada — rejeitada por consistência com
o padrão já usado no feed.

### D3 — Ordenação por visão
Decisão: a visão "Ativos" mantém `sortFeed` (urgentes → não-lidos → recentes) — **nenhuma mudança
na ordenação inteligente** (critério 3). A visão "Arquivo" usa `sortByDate` (dateISO desc: antigos
mais recentes primeiro), pois ordenação inteligente não faz sentido sobre conteúdo histórico.

### D4 — Filtros combinam com a visão
Decisão: categoria (`state.filter`) e ambiente (`state.activeGroupId`) são re-aplicados dentro da
visão atual; a troca de aba re-renderiza com os filtros ativos. `getPosts` passa `groupId`
(visibilidade) e `archive`; a busca (`?search`) continua disponível na API dentro do arquivo
(sem UI hoje).

### D5 — Empty states distintos
Decisão: "Arquivo" vazio mostra estado vazio próprio ("Nenhum comunicado arquivado"), distinto do
empty do feed ativo. Regra 9 da esteira: nunca exibir "null"/data epoch — data ausente segue
renderizando vazio/"—" (comportamento existente dos templates).

## Risks / Trade-offs

- **[Arquivo offline limitado ao último recorte buscado]** → Mitigação: documentado; o cache por
  id (`bulkPut`) acumula posts de ambos os recortes conforme são visitados; garantir leitura do
  arquivo offline exigiria buscar todos — fora do escopo.
- **[Interações no arquivo reordenam o feed ativo?]** → Não: `markUnread`/`markRead` chamam
  `renderFeed()`, que renderiza a visão **atual** (`state.archive`); um post do arquivo marcado
  como não lido permanece no arquivo (spec: não reordena para o feed ativo).
- **[Troca de aba com sheet aberta]** → Mesma regra de QA existente: fechar a sheet antes de
  interagir com chips/abas (backdrop intercepta cliques).

## Migration Plan

- Sem migração de dados. Deploy: backend primeiro (filtro opcional, retrocompatível), depois PWA.
  Rollback do PWA = reverter o commit do feed; o backend sem parâmetro segue como antes.

## Open Questions

- Nenhuma. "Antigo = ≥ 30 dias" e "aba Arquivo" definidos com o dono antes do propose.