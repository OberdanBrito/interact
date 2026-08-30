## Why

O admin precisa destacar comunicados importantes fixando-os no topo do feed do colaborador.
Hoje não existe ação de fixar/desfixar na listagem.

## What Changes

- A listagem de comunicados mostra o selo **"Fixado"** ao lado do título quando `pinned === true`.
- Ação de alternância **Fixar/Desfixar** (botão pin) direto na listagem, visível **apenas para
  comunicados `status === "publicado"`** — rascunho/agendado não exibem a ação (decisão do dono:
  backend também rejeita pin em não-publicado com 400).
- Ao alternar, `updatePost(id, { pinned: !post.pinned })` é chamado e a listagem re-renderiza.
- Ordenação da listagem do admin permanece por data desc (não muda) — pin não reordena o admin.

## Capabilities

### New Capabilities

_(nenhuma)_

### Modified Capabilities

- `posts`: ganha os requisitos de exibição do selo "Fixado" e da ação Fixar/Desfixar apenas
  para comunicados publicados.

## Impact

- `frontend_admin/src/features/posts/list-view.js` — handler da ação de pin.
- `frontend_admin/src/ui/templates.js` — selo "Fixado" (`pinnedBadgeHTML`) e botão pin na linha.
- `frontend_admin/src/data/posts.js` — nenhuma mudança de contrato (repassa `pinned` via PUT).
- `frontend_admin/styles.css` — estilo do selo/botão pin (reuso de classes existentes quando possível).