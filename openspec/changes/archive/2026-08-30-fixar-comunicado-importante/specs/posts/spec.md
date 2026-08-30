## ADDED Requirements

### Requirement: Listagem mostra comunicado fixado
O sistema SHALL exibir o selo "Fixado" ao lado do título de comunicados com `pinned: true` na
listagem do admin. O selo é independente dos selos de urgente/agendado/rascunho/direcionado e
não altera a ordenação da listagem (permanece por data desc).

#### Scenario: Linha de comunicado fixado
- **WHEN** a listagem renderiza um comunicado com `pinned: true`
- **THEN** o selo "Fixado" aparece ao lado do título

#### Scenario: Comunicado não fixado
- **WHEN** a listagem renderiza um comunicado com `pinned: false`
- **THEN** nenhum selo "Fixado" é exibido

### Requirement: Ação Fixar/Desfixar na listagem (somente publicado)
O sistema SHALL oferecer, na listagem, uma ação de alternância Fixar/Desfixar que envia
`PUT /api/posts/:id` com `{ "pinned": !pinned }` e re-renderiza a lista. A ação SHALL ser
exibida **apenas** para comunicados com `status: "publicado"` — rascunho e agendado não exibem
a ação (o backend também rejeita pin em não-publicado com 400).

#### Scenario: Alternar pin em comunicado publicado
- **WHEN** o admin clica em "Fixar" na linha de um comunicado publicado
- **THEN** o sistema envia `PUT /api/posts/:id` com `{ "pinned": true }` e a listagem re-renderiza
  com o selo "Fixado"

#### Scenario: Desfixar comunicado publicado
- **WHEN** o admin clica em "Desfixar" na linha de um comunicado publicado fixado
- **THEN** o sistema envia `PUT /api/posts/:id` com `{ "pinned": false }` e a listagem re-renderiza
  sem o selo "Fixado"

#### Scenario: Rascunho e agendado sem ação
- **WHEN** a listagem renderiza um comunicado com `status` `"rascunho"` ou `"agendado"`
- **THEN** a ação Fixar/Desfixar não é exibida para a linha