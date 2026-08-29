## ADDED Requirements

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
