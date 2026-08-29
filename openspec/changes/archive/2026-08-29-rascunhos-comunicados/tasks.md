## 1. Contrato de dados

- [x] 1.1 Em `src/data/posts.js`, documentar `"rascunho"` no schema de `status` do comunicado

## 2. Formulário (form-view.js)

- [x] 2.1 Em `src/features/posts/form-view.js`, adicionar botão "Salvar rascunho" junto às ações
      do formulário (exibido em novo e em edição de rascunho; oculto em publicado/agendado)
- [x] 2.2 Implementar persistência de rascunho: novo → `POST` com `status: "draft"` (sem modal de
      confirmação); edição de rascunho → `PUT` com `status: "draft"`; redirecionar para a lista
      com toast
- [x] 2.3 Implementar validação condicional: ação "Salvar rascunho" não exige título/autor/corpo;
      ação "Publicar"/agendamento mantém as validações atuais
- [x] 2.4 Garantir que o botão de rascunho não apareça em edição de comunicado publicado ou agendado

## 3. Listagem (list-view.js + templates.js)

- [x] 3.1 Em `src/ui/templates.js`, criar `draftBadgeHTML()` (classe `badge-draft`, texto "Rascunho")
      e exibi-lo em `postRowHTML` quando `post.status === "rascunho"`
- [x] 3.2 Em `src/features/posts/list-view.js`, exibir ação "Publicar" na linha de rascunhos
- [x] 3.3 Implementar ação "Publicar" na lista: `PUT /api/posts/:id` com `status: "published"`,
      recarregando a lista; em caso de erro (400 por campos incompletos), mostrar toast orientando
      a editar
- [x] 3.4 Atualizar o contador de comunicados para citar rascunhos quando existirem

## 4. Verificação

- [x] 4.1 Rodar `npm run build` no frontend_admin
- [x] 4.2 Validar visualmente (Playwright/Chrome DevTools em :5174): criar rascunho, exibir selo na
      lista, publicar rascunho pela lista, salvar rascunho incompleto
