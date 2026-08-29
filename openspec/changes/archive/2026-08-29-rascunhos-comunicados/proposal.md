## Why

O formulário do admin obriga a preencher todos os campos para salvar um comunicado e o publica
(ou agenda) de imediato. Não há como redigir em etapas. Rascunhos dão ao admin a liberdade de
começar um comunicado, salvá-lo incompleto e publicar somente quando estiver pronto.

## What Changes

- **Formulário (`features/posts/form-view.js`)**: passa a oferecer a ação "Salvar rascunho"
  (cria/atualiza um rascunho sem publicar) além de "Publicar". Ao criar, salvar como rascunho
  não exige todos os campos (título mínimo, autor, corpo) — só o essencial para identificar.
- **Validação relaxada em rascunho**: edição de um rascunho não exige todos os campos
  obrigatórios; ao publicar (ou agendar) de um rascunho, os campos passam a ser exigidos.
- **Listagem (`features/posts/list-view.js` + `ui/templates.js`)**: identifica rascunhos com
  selo "Rascunho" e oferece ação "Publicar" que converte o rascunho em publicado de forma
  direta da lista. O contador de comunicados passa a citar rascunhos.
- Sem mudança de rotas no router (novo/editar já suportam criar e editar comunicados).

## Capabilities

### New Capabilities
- `posts`: gestão de comunicados no painel admin, incluindo criação e edição de rascunhos
  (salvar incompleto sem publicar) e publicação de um rascunho existente.

### Modified Capabilities
(nenhuma — não há specs prévias nesta componente; primeira capability formalizada)

## Impact

- `frontend_admin/src/features/posts/form-view.js` — ação "Salvar rascunho", validação
  condicional e transição rascunho → publicado/agendado.
- `frontend_admin/src/features/posts/list-view.js` — selo + ação de publicar rascunho.
- `frontend_admin/src/ui/templates.js` — novo `draftBadgeHTML`/borda visual e botão publicar.
- `frontend_admin/src/data/posts.js` — contrato de `status` passa a incluir `rascunho`.
- Depende do backend aceitar `status: "draft"` (change backend `rascunhos-comunicados`).
