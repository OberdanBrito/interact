## Why

O admin precisa definir um prazo de validade para comunicados e, quando um comunicado expira,
identificá-lo na listagem e reativá-lo. Hoje não existe campo de validade no formulário nem
indicador de expiração na listagem — comunicados vencidos ficam indistinguíveis dos ativos.

## What Changes

- O formulário de comunicado ganha o campo opcional **"Validade"** (`datetime-local`):
  - vazio no payload → comunicado sem validade (campo vazio na UI, nunca `"null"`);
  - preenchido → envia `expiresAt` em ISO;
  - em edição, limpar o campo envia `expiresAt: ""` (reativação — o backend interpreta como
    "sem validade" e mantém o estado atual, ex.: publicado).
- A listagem mostra o selo **"Expirado"** quando `post.expired === true` e exibe a data de
  validade na linha (junto à data de publicação).
- Reativação acontece pela edição: limpar o campo de validade e salvar (não há ação rápida na
  listagem — escopo enxuto, consistente com o fluxo atual).
- Sem `expiresAt` → campo vazio na UI (não `"null"`).

## Capabilities

### New Capabilities

_(nenhuma)_

### Modified Capabilities

- `posts`: ganha os requisitos do campo de validade no formulário (opcional, vazio = sem
  validade, limpar = reativar) e do selo "Expirado" + data de validade na listagem.

## Impact

- `frontend_admin/src/features/posts/form-view.js` — campo "Validade" (`f-expires-at`), leitura
  no payload e envio de `expiresAt` no submit (ISO ou `""`).
- `frontend_admin/src/ui/templates.js` — selo `badge-expired` ("Expirado") e data de validade na
  `postRowHTML`.
- `frontend_admin/src/features/posts/list-view.js` — nenhuma mudança de contrato (a listagem já
  consome o payload do backend; `expired`/`expiresAt` chegam prontos).
- `frontend_admin/src/data/posts.js` — repassa `expiresAt` via POST/PUT (sem mudança de
  assinatura das funções exportadas).
- `frontend_admin/styles.css` — estilo do selo `.badge-expired` (padrão dos `.badge-*`
  existentes).
- **Fora de escopo**: nenhuma mudança em `backend` (change próprio da componente) nem no PWA.