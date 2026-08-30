## Context

Veja `proposal.md` — Why. O PWA renderiza comunicados via `postCardHTML` (`src/features/feed/
templates.js`) no feed e `openSheet` (`src/ui/sheet.js`) no detalhe (bottom sheet). O post carrega
metadados no payload (`id`, `title`, `body`, `author`, `targetGroups`, `attachments`, …). O cache
offline (`src/data/cache.js`, Dexie) armazena os posts completos (incluindo `attachments` como
array de metadados) por `bulkPut`. Não há cache de binários.

## Goals / Non-Goals

**Goals:**
- Exibir a lista de anexos no bottom sheet com link de download/visualização autenticada.
- Renderizar ausência sem `null` (comunidado sem anexo → vazio/"—").
- Não quebrar o cache offline nem a leitura de texto.

**Non-Goals:**
- Pré-visualização inline do arquivo; download em batch; cache/offline do binário do anexo;
  reordenar/rotear o feed por anexos; alterar o esquema do Dexie (metadados já são gravados).

## Decisions

### D1 — Renderizar anexos como lista de links no bottom sheet
Decisão: adicionar uma lista (`<ul class="attachment-list">`) dentro do `sheet-body` (container
`#sheet-attachments` no `index.html`), preenchida por um helper `attachmentsListHTML(attachments)`
em `templates.js`. Cada item é um link (`<a href="/api/posts/:id/attachments/:attachmentId">`)
com nome e indicador de tipo/tamanho. `openSheet` chama o helper com `post.attachments ?? []`.
Descartado: renderizar no card do feed (a lista de anexos pertence ao detalhe — o card é só
resumo) e usar `<download>` como foco principal (download nativo + link cumpre visualização).

### D2 — URL relativa + token JWT no request
Decisão: o link usa a rota canônica `getAttachmentUrl(postId, attachmentId)` (= API_BASE +
`/api/posts/:id/attachments/:attachmentId`). Para garantir autenticação, o `<a>` pode abrir a URL
com o token via query (não ideal) OU o handler intercepta o clique e faz `fetch` autenticado em
blob (`window.URL.createObjectURL`) para download. Escolha: **fetch autenticado em blob** para o
download, mantendo segurança (token nunca em query/URL compartilhável). Descartado: query param
`?token=` (risco de vazamento) e `express.static` público (vaza visibilidade).

### D3 — Ausência renderizada como vazio, nunca "null"
Decisão: `const attachments = post.attachments ?? []; if (attachments.length === 0) omitir a seção
(ou mostrar "—")`. Nunca interpolar `null`/`undefined`/`"null"`. Coerente com a convenção do
projeto (regra 9 da esteira: nunca exibir literal null/epoch na UI).

### D4 — Cache offline só de metadados (sem mudança de esquema)
Decisão: o Dexie já persiste o post com `attachments` (array de objetos serializáveis) via
`bulkPut` — sem bump de versão do banco nem chave adicional. Os binários não são cacheados; o link
de download em offline simplesmente falha na rede (sem erro no app). Descartado: cachear binários
em IndexedDB (blob) — amplia o escopo e o consumo de espaço para um benefício marginal, sem
pedido explícito.

## Risks / Trade-offs

- **[XMLHttpRequest/objeto blob em navegadores restritos]** → Mitigação: usar `fetch` + blob, com
  fallback a `<a target="_blank">` (que pode perder o header de auth em alguns clientes). Validar
  visualmente.
- **[Link em janela nova sem header JWT]** → Mitigação: download via fetch autenticado; para
  visualização inline no app, o blob também funciona. Registrar limitação de "abrir em nova aba"
  sem token como comportamento conhecido.
- **[Sessão expirada ao baixar]** → Mitigação: se o fetch falhar com 401/404, mostrar toast
  amigável (sem quebra); o backend é fonte de verdade de visibilidade.

## Migration Plan

- Sem migração. Rollback: remover `attachmentsListHTML`/`#sheet-attachments` e a chamada em
  `openSheet` — o comunicado sem exibição de anexo continua válido.

## Open Questions

- Nenhuma. A estratégia de download (fetch autenticado em blob) cobre o requisito de
  download/visualização; "abrir em nova aba" sem token é limitação conhecida e documentada.
