## Context

O `GET /api/posts` (backend/src/routes/posts.js) hoje filtra por role e visibilidade de grupo,
serializa via `toPost` (que já deriva `published`/`status`) e, desde a I-12, separa ativos de
arquivados por idade (`?archive`, corte `ARCHIVE_AFTER_DAYS`). O model `Comunicado` já tem campos
de ciclo de publicação (`draft`, `published`, `publishAt`, `pinned`). A I-05 adiciona um novo
eixo — validade — que **não** interage com o scheduler de publicação: é derivado na consulta.
Ver proposal.md — Why para a motivação; os requisitos estão em specs/comunicados/spec.md.

O issue I-05 deixa uma pré-condição em aberto — "expirado vai para o arquivo ou some do feed
apenas?" — resolvida na decisão D1 abaixo.

## Goals / Non-Goals

**Goals:**
- Persistir `expiresAt` opcional (Date, default `null`) e expô-lo no payload com `expired`
  derivado — sem mudar o eixo de `status`.
- Colaborador nunca vê expirado (feed, arquivo e detalhe); admin vê tudo com indicador.
- Reativação = limpar `expiresAt`, mantendo o estado de publicação.
- Expiração puramente derivada na consulta — sem job/scheduler novo.

**Non-Goals:**
- Sem scheduler/job de "expiração" (nada é deletado nem atualizado no tempo — só filtro no GET).
- Sem mudança no PWA (backend filtra por role; o cache offline pode reter snapshot até o próximo
  fetch — limitação aceita).
- Sem validação cruzada `expiresAt` × `publishAt` (agendado que expire antes de liberar some
  imediatamente ao liberar — comportamento aceito).
- Sem ação rápida de reativar na listagem do admin (a reativação é via edição; change próprio da
  componente `frontend_admin`).

## Decisions

### D1 — Expirado some do feed inteiro do colaborador, inclusive do "Arquivo"
Decisão: o filtro de expirados no GET do colaborador vale **sempre** — sem `?archive`,
`archive=active` e `archive=archived`. Um comunicado expirado nunca aparece para o colaborador.
Alternativas descartadas: (a) mover expirado para o arquivo — manteria conteúdo "não mais válido"
visível na aba de histórico, contradizendo o propósito da expiração; (b) ocultar só do feed ativo
— inconsistente e ambíguo para o colaborador. O admin, único que reativa, continua vendo tudo.

### D2 — `expired` derivado, não um estado persistido
Decisão: `expired = expiresAt != null && expiresAt < now`, computado no `toPost` (payload) e no
filtro do GET (mesma expressão). O campo `status` permanece rascunho/agendado/publicado — ciclo
de publicação e validade são eixos independentes. Alternativa: adicionar `"expirado"` ao `status`
— acopla os dois eixos, exigiria ajustes de UI/ordenação e quebraria o significado atual de
`status` no admin/PWA.

### D3 — Filtro por consulta, sem scheduler
Decisão: a expiração é avaliada no momento do GET comparando `expiresAt` com `Date.now()`. Nada
é deletado nem re-agendado no tempo. Um job que "expirasse" documentos seria redundante (não há
estado a manter — o documento fica intacto e o filtro basta) e inconsistente com a I-12, que
também deriva por idade sem job. Nota: `{ expiresAt: null }` no filtro Mongo casa também
documentos legados **sem** o campo, então nenhuma migração de dados é necessária.

### D4 — Validação de `expiresAt` aceita passado, rejeita formato inválido
Decisão: no `POST`/`PUT`, `expiresAt` é opcional; data não parseável → `400`; data válida
(futura **ou passada**) é aceita — passada = expiração imediata (`expired: true`), útil para
"expirar agora". `""`/`null` limpa o campo (sem validade; reativa). Alternativa: exigir futuro
como `publishAt` — mais restritivo do que o issue pede ("nunca bloqueia") e impede expiração
imediata.

### D5 — Reativação mantém o estado atual
Decisão: limpar `expiresAt` (PUT com `expiresAt: ""`/`null`) apenas zera o campo; `draft`,
`published`, `publishAt` e `pinned` permanecem como estão. Consistente com o requisito do issue
("Reativar = limpar `expiresAt`, mantém o estado atual, ex.: publicado").

## Risks / Trade-offs

- **[Agendado com `expiresAt` anterior ao `publishAt`]** → ao liberar, já nasce expirado e some
  do feed imediatamente. Mitigação: comportamento aceito e documentado (fora de escopo a
  validação cruzada); o admin vê o selo e pode limpar a validade.
- **[Relógio do servidor como fonte da expiração]** → a visibilidade depende do clock do backend.
  Mitigação: mesma base de tempo usada por todo o sistema (`Date.now()`), sem cache no servidor.
- **[PWA com cache offline (Dexie)]** → um snapshot expirado pode continuar visível offline até o
  próximo fetch bem-sucedido. Mitigação: fora do controle do backend; o próximo fetch remove.
- **[Sem evento no momento exato da expiração]** → nada "acontece" quando o prazo vence (sem
  notificação). Mitigação: o requisito é apenas sair do feed — filtro de consulta atende.

## Migration Plan

- Sem migração de dados: campo novo opcional; documentos legados sem `expiresAt` são casados por
  `{ expiresAt: null }` no filtro e serializados como `expiresAt: null`/`expired: false`
  (`toPost` usa `doc.expiresAt ?? null`).
- Rollback: remover o filtro do GET, o aceite no POST/PUT e os campos do payload; dados com
  `expiresAt` já gravados ficam inertes (nunca lidos se o payload não os expõe).

## Open Questions

- Nenhuma. A pré-condição do issue (interação com arquivo) foi decidida em D1.