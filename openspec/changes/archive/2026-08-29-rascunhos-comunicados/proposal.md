## Why

O admin não tem como salvar um comunicado incompleto para retomar depois: hoje o formulário
obriga a publicar (ou agendar) com todos os campos preenchidos. Rascunhos permitem redigir o
conteúdo em etapas, sem que ele vaze para os colaboradores antes de estar pronto.

## What Changes

- Model `Comunicado` passa a distinguir **rascunho** (salvo, não publicado, sem data de
  liberação) de **agendado** (com `publishAt` futuro) e **publicado**.
- `POST /api/posts` aceita criação de rascunho (`status: "draft"`): cria o documento com
  `published: false`, sem exigir todos os campos obrigatórios (título/corpo podem estar vazios).
- `PUT /api/posts/:id` permite editar um rascunho com validação relaxada (não exige todos os
  campos) e transicioná-lo para **publicado** (ou **agendado**) quando estiver pronto.
- `GET /api/posts` e `GET /api/posts/:id` continuam ocultando rascunhos de colaboradores: um
  rascunho tem `published: false`, então o filtro `published: true` já garante invisibilidade.
  Apenas o admin (dono, via `createdBy`) vê seus rascunhos na listagem.
- O helper `toPost` passa a reportar `status: "rascunho"` para documentos em draft.

## Capabilities

### New Capabilities
- `comunicados`: API de criação, edição, listagem e publicação de comunicados, incluindo o
  ciclo de vida de rascunhos (salvar incompleto, editar, publicar/agendar quando pronto).

### Modified Capabilities
(nenhuma — não há specs prévias nesta componente; esta é a primeira capability formalizada)

## Impact

- `backend/src/models/Comunicado.js` — novo campo de estado de rascunho.
- `backend/src/routes/posts.js` — POST aceita draft; PUT valida/transiciona draft.
- `backend/src/routes/posts.js` helper `toPost` — novo status `rascunho`.
- Compatível com agendamento (I-01): rascunho pode ser publicado agora ou agendado.
- Sem impacto no painel PWA do colaborador (nunca recebe drafts).
