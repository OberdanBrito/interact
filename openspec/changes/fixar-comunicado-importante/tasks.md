## 1. Selo "Fixado" na listagem

- [x] 1.1 Criar `pinnedBadgeHTML()` em `src/ui/templates.js` (classe `badge badge-pinned`, ícone pin)
- [x] 1.2 Renderizar o selo em `postRowHTML` na `cell-title`, antes do selo de urgente, quando `post.pinned === true`
- [x] 1.3 Adicionar estilo `.badge-pinned` em `styles.css` no padrão dos `.badge-*` existentes

## 2. Ação Fixar/Desfixar na listagem

- [x] 2.1 Em `postRowHTML`, adicionar botão `js-pin` com `data-post-id` na `cell-actions`, **apenas** quando `post.status === "publicado"`; título/aria-label alternam "Fixar"/"Desfixar" conforme `post.pinned`
- [x] 2.2 Em `src/features/posts/list-view.js`, tratar o clique em `js-pin`: `updatePost(id, { pinned: !pinned })`, toast ("Comunicado fixado com sucesso"/"Comunicado desfixado com sucesso"), `renderRows(root)`; em erro, toast de falha
- [x] 2.3 Adicionar estilo do botão pin (reuso de `icon-btn`) em `styles.css` se necessário

## 3. QA visual (portão Fase 5 — a executar no apply)

- [x] 3.1 Validar no Chrome DevTools :5174 que o admin vê o selo "Fixado" e o botão Fixar/Desfixar apenas em publicados, e que a alternância persiste