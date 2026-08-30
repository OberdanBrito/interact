# Design — Fixar comunicado importante (frontend_admin)

## Context

A listagem do admin (`list-view.js`) renderiza linhas via `postRowHTML` com selos
(agendado/rascunho/urgente/direcionado) e ações (`js-publish` p/ rascunho, link editar,
`js-delete`). `listPosts()` re-ordena client-side por `dateISO` desc. Não há ação de pin.

## Goals / Non-Goals

- **Goal:** exibir o selo "Fixado" e oferecer a alternância Fixar/Desfixar na listagem para
  comunicados publicados.
- **Non-Goal:** reordenar a listagem do admin por pin (permanece data desc); mover a ação
  para o formulário de edição (a issue exige "pela listagem").

## Decisions

### D1 — Selo "Fixado" no título
Novo helper `pinnedBadgeHTML()` em `ui/templates.js` (classe `badge badge-pinned`, ícone de
pin) renderizado em `postRowHTML` na `cell-title`, antes do selo de urgente — independência
visual entre fixado e urgente (requisito da issue).

### D2 — Botão Fixar/Desfixar (toggle) na listagem
Em `cell-actions`, botão `js-pin` com `data-post-id`, exibido **apenas** quando
`post.status === "publicado"` (rascunho/agendado sem ação — decisão do dono). Título e
`aria-label` alternam "Fixar"/"Desfixar" conforme `post.pinned`.

### D3 — Handler de alternância
Estender o listener de clique da `tbody` (`openPublishOrDelete` → tratar também `js-pin`):
`handleTogglePin(postId, pinnedAtual)` chama `updatePost(postId, { pinned: !pinnedAtual })`,
exibe toast ("Comunicado fixado/desfixado com sucesso") e `renderRows(root)` re-renderiza.
Em caso de erro (ex.: `400` do backend), toast de falha.

### D4 — Ordenação da listagem inalterada
`listPosts()` segue re-ordenando por data desc — pin não reordena a listagem do admin. O selo
e o botão refletem o `pinned` vindo do payload do backend.

### D5 — Estilo
`.badge-pinned` em `styles.css`, seguindo o padrão dos demais `.badge-*` (reuso de
variáveis/cores existentes). Botão pin usa `icon-btn` com ícone pin.

## Risks / Trade-offs

- [Estado visual divergir do backend se o PUT falhar] → handler trata erro com toast e
  re-renderiza; a lista sempre re-sincroniza de `listPosts()`.
- [Pin em comunicado recém-despublicado] → não há despublicação de publicado (imutabilidade
  pós-liberação, I-02), então o toggle só age em publicados estáveis.

## Migration Plan

N/A — mudança de UI apenas.

## Open Questions

Nenhuma.