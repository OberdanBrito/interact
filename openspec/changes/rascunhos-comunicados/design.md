## Context

O painel admin (Vite vanilla, `features/posts/`) tem hoje duas ações de persistência: "Publicar
comunicado" (novo, via modal de confirmação com contagem de destinatários) e "Salvar alterações"
(edição). O formulário (`form-view.js`) valida todos os campos obrigatórios antes de salvar:
título (≥3), categoria, autor e corpo. A listagem (`list-view.js` + `ui/templates.js`) já exibe
selo "Agendado" (I-01) e o helper `postRowHTML`.

Para suportar rascunhos, o admin precisa: (a) criar um comunicado sem publicar com validação
relaxada; (b) editar um rascunho sem exigir todos os campos; (c) identificar rascunhos na lista
e publicá-los de lá.

## Goals / Non-Goals

**Goals:**
- Ação "Salvar rascunho" no formulário (novo e edição de rascunho) sem passar pelo modal de
  confirmação de envio.
- Validação condicional: rascunho exige só o mínimo; publicar/agendar exige todos os campos.
- Selo "Rascunho" + ação "Publicar" na listagem (converte rascunho → publicado).
- Contador da lista explicita rascunhos.

**Non-Goals:**
- Não alterar o PWA do colaborador nem o fluxo de agendamento existente.
- Não adicionar tela separada de rascunhos (nota: filtro na própria listagem por status).

## Decisions

### D1 — Ação "Salvar rascunho" no formulário
Adicionar um botão secundário "Salvar rascunho" junto aos ações principais do `form-view.js`:
- **Novo**: salva via `POST /api/posts` com `status: "draft"`, direto (sem modal de confirmação)
  e redireciona para a lista.
- **Edição de rascunho**: salva via `PUT /api/posts/:id` mantendo `status: "draft"`.
- **Edição de publicado/agendado**: o botão de rascunho não é exibido (não faz sentido).

### D2 — Validação condicional
O `form-view.js` passa a distinguir o alvo:
- Se a ação for "Salvar rascunho": exige apenas um mínimo para identificar (ex.: título vazio
  permitido, mas o POST/PUT envia `status: "draft"` e `body` parcial). Categoria sempre presente
  (default "geral").
- Se a ação for "Publicar" (novo/edição) ou "Agendar": mantém as validações atuais
  (título ≥3, autor nome/cargo, corpo não vazio, agendamento futuro se houver).

### D3 — Botão "Publicar" na listagem
Em `list-view.js`, para linhas com `status === "rascunho"`, exibir além de editar/excluir uma
ação "Publicar" (`ui/templates.js`). Ao clicar, envia `PUT /api/posts/:id` com `status:
"published"` (sem modal de destinatários, para não ampliar escopo) e recarrega a lista com um
toast. Requer que o rascunho tenha os campos obrigatórios; se o backend rejeitar (400), mostra
o erro e orienta a editar.

### D4 — Selo "Rascunho" e contador
- `ui/templates.js`: novo `draftBadgeHTML()` com classe `badge-draft` e texto "Rascunho",
  exibido em `postRowHTML` quando `post.status === "rascunho"`.
- `list-view.js`: o contador cita rascunhos quando houver (ex.: "3 comunicados (1 rascunho)").

### D5 — Contrato de dados
`src/data/posts.js`: o schema de `status` do comunicado passa a incluir `"rascunho"` (comentário)
e `createPost`/`updatePost` já repassam `status` no payload (sem mudança de assinatura).

## Risks / Trade-offs

- [Publicar rascunho direto da lista pode falhar se faltar campo obrigatório] → Toast de erro e
  redirecionamento para a edição do rascunho; sem modal para não ampliar escopo.
- [Validação divergente entre ações pode confundir] → Rótulos claros nos botões e textarea de
  hint indicam o que é exigido ao publicar.
