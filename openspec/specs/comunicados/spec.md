## Purpose

API de comunicados do Interact: criação, edição, publicação, agendamento e rascunho de
comunicados, com visibilidade por grupo e estado derivado (rascunho/agendado/publicado).

## Requirements

### Requirement: Criar rascunho de comunicado
O sistema SHALL permitir ao admin criar um comunicado como rascunho (`status: "draft"`), salvo
sem publicação e sem data de liberação, com validação relaxada (título, autor e corpo
opcionais).

#### Scenario: Criar rascunho somente com título
- **WHEN** um admin envia `POST /api/posts` com `status: "draft"` e apenas `title` preenchido
- **THEN** o sistema cria o comunicado com `published: false`, `draft: true` e `publishAt: null`
- **AND** retorna o comunicado com `status: "rascunho"` em 201

#### Scenario: Criar rascunho sem título
- **WHEN** um admin envia `POST /api/posts` com `status: "draft"` e `title` vazio
- **THEN** o sistema aceita a criação (sem exigir título) e cria um rascunho

#### Scenario: Rascunho é invisível ao colaborador
- **WHEN** um colaborador chama `GET /api/posts`
- **THEN** o rascunho não aparece na lista (filtro `published: true`)

### Requirement: Editar rascunho com validação relaxada
O sistema SHALL permitir editar um rascunho sem exigir todos os campos obrigatórios, e o
rascunho permanece não publicado após a edição.

#### Scenario: Editar rascunho incompleto
- **WHEN** um admin envia `PUT /api/posts/:id` em um rascunho com apenas o título alterado
- **THEN** o sistema aplica a alteração sem exigir autor ou corpo
- **AND** o comunicado continua com `status: "rascunho"` e `published: false`

#### Scenario: Editar alvo de um rascunho
- **WHEN** um admin envia `PUT /api/posts/:id` em um rascunho ainda não publicado alterando
  `targetGroups`
- **THEN** o sistema permite alterar o alvo (não gera 400 de imutabilidade)

### Requirement: Publicar rascunho
O sistema SHALL permitir transformar um rascunho em comunicado publicado (publicar agora) ou
agendado.

#### Scenario: Publicar rascunho imediatamente
- **WHEN** um admin envia `PUT /api/posts/:id` em um rascunho com `status: "published"` e todos
  os campos obrigatórios preenchidos
- **THEN** o sistema define `published: true`, `draft: false`, `publishAt: null`
- **AND** retorna `status: "publicado"`

#### Scenario: Agendar rascunho
- **WHEN** um admin envia `PUT /api/posts/:id` em um rascunho com `publishAt` futuro e sem
  `status: "draft"`
- **THEN** o sistema define `draft: false` e agenda a liberação para `publishAt`
- **AND** retorna `status: "agendado"`

#### Scenario: Publicar rascunho sem título é rejeitado
- **WHEN** um admin tenta publicar um rascunho (`status: "published"`) com título vazio
- **THEN** o sistema responde 400 exigindo o título

#### Scenario: Publicar rascunho sem corpo ou autor é rejeitado
- **WHEN** um admin tenta publicar um rascunho (`status: "published"`) sem conteúdo (`body`
  vazio) ou sem autor (nome vazio), mesmo com título preenchido
- **THEN** o sistema responde 400 exigindo os campos obrigatórios de publicação

### Requirement: Reportar status de rascunho na API
O helper de resposta `toPost` SHALL reportar `status: "rascunho"` para documentos em draft.

#### Scenario: Status derivado corretamente
- **WHEN** o sistema serializa um comunicado com `draft: true`
- **THEN** o campo `status` da resposta é `"rascunho"`
