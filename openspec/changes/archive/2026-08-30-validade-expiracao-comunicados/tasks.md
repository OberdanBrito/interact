## 1. Campo "Validade" no formulário

- [x] 1.1 Adicionar em `src/features/posts/form-view.js` o campo `f-expires-at` (datetime-local) ao lado do campo "Agendamento", visível sempre (criar e editar), com valor `toDatetimeLocal(values.expiresAt)` (vazio quando `null`) — verificar que editar comunicado sem validade mostra o campo vazio (nunca `"null"`)
- [x] 1.2 Incluir `expiresAt` no map `input` do form; no submit: campo vazio → criação omite `expiresAt`, edição envia `expiresAt: ""` (limpa/reativa); preenchido → `new Date(raw).toISOString()` — verificar payload enviado no Network
- [x] 1.3 Adicionar hint textual do campo ("Em branco = sem validade. Ao expirar, o comunicado sai do app automaticamente.") com o padrão `field-hint` — verificar visual do formulário

## 2. Selo "Expirado" e data de validade na listagem

- [x] 2.1 Criar `expiredBadgeHTML()` em `src/ui/templates.js` (classe `badge badge-expired`) e renderizá-lo em `postRowHTML` na `cell-title`, **antes** dos demais selos, quando `post.expired === true` — verificar selo na linha do expirado
- [x] 2.2 Exibir a data de validade na coluna "Data" (`cell-meta`): linha secundária "Expira em {fullDate(expiresAt)}" quando `expiresAt` presente; sem `expiresAt`, apenas a data de publicação atual — verificar linha renderizada
- [x] 2.3 Adicionar estilo `.badge-expired` em `styles.css` no padrão dos `.badge-*` existentes — verificar visual da listagem
- [x] 2.4 Rodar `npm run build` (portão Fase 4) — build do Vite conclui sem erros

## 3. QA visual (portão Fase 5 — a executar no apply)

- [x] 3.1 Validar no Chrome DevTools :5174: campo "Validade" no formulário (criar/editar) vazio sem `expiresAt`; comunicado expirado mostra selo "Expirado" e data de validade na listagem; reativação (limpar campo + salvar) remove o selo após reload