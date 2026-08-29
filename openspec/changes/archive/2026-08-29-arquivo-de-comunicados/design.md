## Context

O `GET /api/posts` (backend/src/routes/posts.js) hoje retorna todos os comunicados elegíveis do
colaborador (`published: true`, visibilidade por grupo/broadcast), ordenados por `dateISO` desc,
com filtros opcionais `?category`, `?search` e `?groupId`. Não há separação por idade: comunicados
antigos aparecem junto com os recentes no feed do PWA. A I-12 adiciona a separação
ativos/arquivados, decidida com o dono como **corte por idade** (30 dias) e **aba "Arquivo" no
PWA**.

## Goals / Non-Goals

**Goals:**
- Expor no backend um filtro opcional de arquivo por idade, combinável com os filtros existentes
  (categoria, busca, grupo) e sem quebrar o comportamento atual quando o parâmetro não é enviado.
- Manter a definição de "antigo" idêntica entre backend e PWA (30 dias).

**Non-Goals:**
- Nenhuma mudança de schema do Mongo (campo de arquivamento manual, flag `archived`).
- Nenhuma ação de arquivamento no admin; nenhuma mudança em `frontend_admin`.
- Não alterar a ordenação inteligente do feed ativo (é responsabilidade do PWA; aqui só se
  restringe o conjunto).

## Decisions

### D1 — Filtro por idade via `?archive=active|archived`, não um campo "archived" no documento
Decisão: o arquivo é **derivado da idade** (`dateISO`), não um estado persistido. `?archive`
seleciona o recorte na hora da consulta:
- `archive=active` → `dateISO >= now - ARCHIVE_AFTER_DAYS`;
- `archive=archived` → `dateISO < now - ARCHIVE_AFTER_DAYS`;
- ausência do parâmetro → sem restrição de idade (comportamento atual).
Alternativas descartadas: (a) flag `archived` no model — exige ação manual/agendada no admin,
amplia o escopo e polui o schema; (b) filtro de período arbitrário (`?fromDate`) — menos claro
para o usuário e acopla UI a datas absolutas.

### D2 — Constante única `ARCHIVE_AFTER_DAYS` (default 30, env-overridable)
Decisão: a janela de "ativo" fica em uma constante no backend (`process.env.ARCHIVE_AFTER_DAYS ||
30`), e o PWA usa o mesmo valor literalmente em seu filtro de exibição (o PWA hoje não tem acesso
a config do backend). O valor padrão é 30 (decisão do dono). Alternativa: expor a constante via
endpoint de config — sob engenharia para o porte da feature.

### D3 — Admin ignora o parâmetro `?archive`
Decisão: para `req.user.role === "admin"`, `?archive` não altera o resultado (admin continua vendo
só o que publicou). O filtro de arquivo é da experiência do colaborador. Racional: o admin não tem
aba "Arquivo" e a separação por idade não faz sentido na listagem administrativa.

### D4 — Data de referência = `dateISO` (data de publicação/posicionamento no feed)
Decisão: o corte usa `dateISO` (data efetiva do comunicado: publicação ou agendamento), não
`createdAt`/`publishAt`. Racional: `dateISO` é o campo que o feed já usa para ordenação e reflete
a data em que o comunicado se tornou relevante ao colaborador (I-01 posiciona agendados por
`dateISO`).

## Risks / Trade-offs

- **[Aba "Arquivo" no PWA com corte fixo]** → Mitigação: constante única documentada; mudar a
  janela é alterar um valor (env no backend e constante no PWA) — o spec exige critério idêntico
  entre os dois.
- **[Sem parâmetro mantém tudo]** → Feed do PWA sempre envia `?archive=active|archived`, então a
  poluição do feed principal é eliminada na origem; o default preserva compatibilidade com os
  testes/QA existentes da API.
- **[Comunicado recém-liberado por agendamento]** → `dateISO` = `publishAt`, então um agendado
  liberado hoje entra no corte "ativo" naturalmente; sem risco de sumir do feed ativo.

## Migration Plan

- Sem migração de dados: a feature é puramente de consulta (`?archive` no GET /api/posts) e UI
  (PWA). Rollback = remover o parâmetro dos requests do PWA; o backend sem o parâmetro mantém o
  comportamento anterior.

## Open Questions

- Nenhuma. Decisões de escopo (corte por idade = 30 dias, aba "Arquivo") foram definidas com o
  dono antes do propose.