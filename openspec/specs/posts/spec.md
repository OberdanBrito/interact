## Purpose

Gestão de comunicados no painel admin do Interact: criar, editar, publicar, agendar e manter
rascunhos, com identificação visual de estado, validade/expiração (`expiresAt`), fixação de
comunicados importantes (pinned) e publicação direta da listagem.

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

#### Scenario: Rascunho-renderiza
  sem o selo "Fixado"

#### Scenario: Rascunho e agendado sem ação
- **WHEN** a listagem renderiza um comunicado com `status` `"rascunho"` ou `"agendado"`
- **THEN** a ação Fixar/Desfixar não é exibida para a linha

### Requirement: Formulário tem campo de validade opcional
O sistema SHALL exibir no formulário de comunicado um campo opcional "Validade" (datetime-local).
Quando o comunicado não tem `expiresAt`, o campo SHALL aparecer vazio (nunca `"null"` nem data
epoch). Ao salvar: campo vazio → o payload não envia `expiresAt` (criação) ou envia `expiresAt: ""`
(edição, limpando a validade); campo preenchido → o payload envia `expiresAt` em ISO.

#### Scenario: Criar comunicado sem validade
- **WHEN** o admin abre o formulário de novo comunicado sem preencher o campo de validade e salva
- **THEN** o payload enviado não contém `expiresAt`

#### Scenario: Definir validade na criação
- **WHEN** o admin preenche o campo de validade com uma data/hora e salva
- **THEN** o payload envia `expiresAt` em ISO com a data/hora escolhida

#### Scenario: Edição sem validade mostra campo vazio
- **WHEN** o admin edita um comunicado com `expiresAt: null`
- **THEN** o campo de validade aparece vazio (não `"null"`)

#### Scenario: Limpar validade reativa
- **WHEN** o admin edita um comunicado expirado, apaga o valor do campo de validade e salva
- **THEN** o payload envia `expiresAt: ""` (o backend limpa a validade e o comunicado volta a ser ativo)

### Requirement: Listagem identifica comunicado expirado
O sistema SHALL exibir na listagem o selo "Expirado" ao lado do título de comunicados com
`expired: true` no payload, e exibir a data de validade na linha (junto à data de publicação).
Comunicados sem `expiresAt` não exibem selo nem data de validade.

#### Scenario: Linha de comunicado expirado
- **WHEN** a listagem renderiza um comunicado com `expired: true`
- **THEN** o selo "Expirado" aparece ao lado do título e a data de validade é exibida na linha

#### Scenario: Comunicado sem validade
- **WHEN** a listagem renderiza um comunicado com `expiresAt: null`
- **THEN** nenhum selo "Expirado" é exibido e nenhuma data de validade aparece na linha

### Requirement: Anexar arquivo no formulário de comunicado
O formulário de comunicado do painel admin SHALL permitir ao admin anexar um arquivo (incluindo
imagem) a um comunicado. O campo de anexo SHALL ser **sempre opcional**: nunca bloquear criar,
salvar rascunho, publicar ou agendar.

- Ao **criar** um novo comunicado com um arquivo selecionado, o sistema SHALL enviar o arquivo
  ao backend após a criação do post (o backend exige `:id`);
- ao **editar**, SHALL enviar o arquivo diretamente a `POST /api/posts/:id/attachments`;
- um comunicado sem anexo SHALL exibir o campo vazio/"—" (nunca `null` literal).

#### Scenario: Anexar arquivo a um novo comunicado
- **WHEN** o admin seleciona um arquivo no formulário de novo comunicado e publica
- **THEN** o sistema cria o post e envia o arquivo ao backend (`POST /api/posts/:id/attachments`)
- **AND** o anexo aparece na lista de anexos do comunicado

#### Scenario: Anexar arquivo a um comunicado em edição
- **WHEN** o admin seleciona um arquivo no formulário de edição e salva
- **THEN** o sistema envia o arquivo a `POST /api/posts/:id/attachments`
- **AND** o anexo aparece na lista de anexos

#### Scenario: Comunicado sem anexo mostra vazio
- **WHEN** um comunicado não possui anexos
- **THEN** o sistema exibe a seção de anexos vazia/"—" (sem o literal `null`)

### Requirement: Listar e remover anexos no formulário
O sistema SHALL exibir a lista de anexos do comunicado no formulário (nome, tipo/tamanho) e
permitir ao admin remover um anexo (`DELETE /api/posts/:id/attachments/:attachmentId`). A remoção
de um anexo não altera o estado do comunicado (publicado, agendado ou rascunho permanece).

#### Scenario: Administrador vê anexos do comunicado
- **WHEN** o admin abre o formulário de edição de um comunicado com anexos
- **THEN** o sistema lista os anexos com nome e tipo/tamanho

#### Scenario: Administrador remove um anexo
- **WHEN** o admin clica em "Remover" em um anexo da lista
- **THEN** o sistema envia `DELETE /api/posts/:id/attachments/:attachmentId`
- **AND** o anexo some da lista

### Requirement: Validar limites de anexo no formulário
O formulário SHALL validar o arquivo selecionado contra os mesmos limites de tamanho e tipo
definidos no backend (que é a fonte de verdade), exibindo um erro claro ao usuário em caso de
arquivo muito grande ou de tipo não permitido, sem publicar o comunicado.

#### Scenario: Upload de arquivo acima do limite exibe erro
- **WHEN** o admin seleciona um arquivo acima do tamanho máximo
- **THEN** o sistema exibe uma mensagem de erro clara (sem publicar o comunicado)

#### Scenario: Upload de tipo não permitido exibe erro
- **WHEN** o admin seleciona um arquivo de tipo não permitido
- **THEN** o sistema exibe uma mensagem de erro clara (sem publicar o comunicado)
