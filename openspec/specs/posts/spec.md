## Purpose

Gestão de comunicados no painel admin do Interact: criar, editar, publicar, agendar e manter
rascunhos, com identificação visual de estado, fixação de comunicados importantes (pinned) e
publicação direta da listagem.

## Requirements

### Requirement: Salvar rascunho no formulário
O painel admin SHALL permitir salvar um comunicado como rascunho a partir do formulário, sem
publicá-lo e sem exigir todos os campos obrigatórios.

#### Scenario: Salvar novo rascunho
- **WHEN** o admin preenche o formulário de novo comunicado e clica em "Salvar rascunho"
- **THEN** o sistema envia `POST /api/posts` com `status: "draft"` sem abrir o modal de confirmação
- **AND** redireciona para a lista

#### Scenario: Salvar rascunho incompleto
- **WHEN** o admin salva como rascunho com título vazio ou sem corpo
- **THEN** o sistema aceita a criação sem exigir título/autor/corpo

#### Scenario: Botão de rascunho ausente em publicado
- **WHEN** o admin edita um comunicado já publicado ou agendado
- **THEN** o sistema não exibe a ação "Salvar rascunho"

### Requirement: Editar rascunho existente
O sistema SHALL permitir editar um rascunho sem exigir todos os campos obrigatórios, mantendo-o
como rascunho.

#### Scenario: Atualizar rascunho mantendo rascunho
- **WHEN** o admin edita um rascunho e clica em "Salvar rascunho"
- **THEN** o sistema envia `PUT /api/posts/:id` com `status: "draft"` e mantém o status de rascunho

### Requirement: Publicar rascunho
O sistema SHALL permitir publicar um rascunho a partir da listagem.

#### Scenario: Publicar rascunho pela lista
- **WHEN** o admin clica em "Publicar" na linha de um rascunho na listagem
- **THEN** o sistema envia `PUT /api/posts/:id` com `status: "published"`
- **AND** recarrega a lista com a confirmação

#### Scenario: Publicar rascunho incompleto falha e orienta
- **WHEN** o admin tenta publicar um rascunho sem título ou sem corpo
- **THEN** o sistema exibe um erro indicando que o rascunho precisa ser editado antes de publicar

### Requirement: Identificar rascunhos na listagem
O sistema SHALL identificar rascunhos na listagem com selo visual e contador explícito.

#### Scenario: Selo Rascunho na linha
- **WHEN** a listagem renderiza um comunicado com `status: "rascunho"`
- **THEN** o sistema exibe o selo "Rascunho" na linha do comunicado

#### Scenario: Contador cita rascunhos
- **WHEN** a listagem possui rascunhos
- **THEN** o contador de comunicados menciona a quantidade de rascunhos

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
