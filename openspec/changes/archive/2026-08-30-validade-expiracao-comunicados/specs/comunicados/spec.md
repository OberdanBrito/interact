## ADDED Requirements

### Requirement: Comunicado pode ter validade (expiresAt)
O sistema SHALL persistir um campo opcional `expiresAt` (Date, default `null`) no comunicado e
expô-lo no payload de `GET/POST/PUT /api/posts` como `expiresAt` (ISO string ou `null`) junto
com um indicador derivado `expired` (boolean). `expired` SHALL ser `true` quando `expiresAt`
existe e é anterior ao momento atual. O campo `status` não muda (rascunho/agendado/publicado
permanecem como hoje).

#### Scenario: Criar comunicado sem validade
- **WHEN** um comunicado é criado sem informar `expiresAt`
- **THEN** o payload retorna `expiresAt: null` e `expired: false`

#### Scenario: Criar comunicado com validade futura
- **WHEN** um comunicado é criado com `expiresAt` no futuro
- **THEN** o payload retorna `expiresAt` em ISO e `expired: false`

#### Scenario: Payload expõe expiração derivada
- **WHEN** um comunicado tem `expiresAt` anterior ao momento atual
- **THEN** `GET /api/posts` e `GET /api/posts/:id` retornam `expired: true` no payload

### Requirement: Colaborador não vê comunicados expirados
O sistema SHALL filtrar comunicados expirados (`expired: true`) da listagem e do detalhe do
colaborador: `GET /api/posts` não retorna expirados (em nenhuma visão — sem `?archive`,
`archive=active` ou `archive=archived`) e `GET /api/posts/:id` de um comunicado expirado não é
elegível (retorna `404`). Comunicado sem `expiresAt` nunca é expirado.

#### Scenario: Expirado some do feed
- **WHEN** um colaborador chama `GET /api/posts` e existe um comunicado elegível com `expiresAt` anterior a agora
- **THEN** o comunicado expirado não aparece na resposta

#### Scenario: Expirado não aparece no arquivo
- **WHEN** um colaborador chama `GET /api/posts?archive=archived` e existe um comunicado elegível expirado
- **THEN** o comunicado expirado não aparece na resposta (expiração vale também no arquivo)

#### Scenario: Detalhe de expirado não é elegível
- **WHEN** um colaborador chama `GET /api/posts/:id` de um comunicado expirado
- **THEN** o sistema responde `404` (não revela a existência)

#### Scenario: Comunicado sem validade continua visível
- **WHEN** um colaborador chama `GET /api/posts` e existe um comunicado elegível sem `expiresAt`
- **THEN** o comunicado aparece normalmente na resposta

### Requirement: Admin vê comunicados expirados com indicador
O sistema SHALL não filtrar comunicados expirados para o admin: `GET /api/posts` do admin
continua retornando somente o que ele publicou (filtro `createdBy`), incluindo expirados, com
`expired: true` no payload para identificação.

#### Scenario: Admin lista comunicado expirado
- **WHEN** um admin chama `GET /api/posts` e publicou um comunicado com `expiresAt` anterior a agora
- **THEN** o comunicado aparece na resposta com `expired: true`

#### Scenario: Admin não filtra expirados por arquivo
- **WHEN** um admin chama `GET /api/posts?archive=archived`
- **THEN** o admin continua recebendo somente o que publicou, com expirados incluídos (sem separação)

### Requirement: expiresAt nunca bloqueia outras ações
O sistema SHALL tratar `expiresAt` como campo estritamente opcional em `POST /api/posts` e
`PUT /api/posts/:id`: sua ausência nunca impede criar, salvar rascunho, publicar ou agendar.
Data de expiração inválida (formato não parseável) SHALL retornar `400`; data válida no passado
é aceita e resulta em `expired: true` imediatamente (expiração imediata). Enviar `expiresAt`
vazio/`null` limpa o campo (comunicado volta a não ter validade) sem alterar o estado de
publicação.

#### Scenario: Salvar rascunho sem validade
- **WHEN** um admin envia `POST /api/posts` com `status: "draft"` e sem `expiresAt`
- **THEN** o sistema cria o rascunho normalmente, sem exigir validade

#### Scenario: Publicar sem validade
- **WHEN** um admin publica um comunicado sem `expiresAt`
- **THEN** o sistema publica normalmente e o payload retorna `expiresAt: null`

#### Scenario: Data de validade inválida é rejeitada
- **WHEN** um admin envia `POST /api/posts` com `expiresAt` em formato não parseável
- **THEN** o sistema retorna `400` sem criar o comunicado

#### Scenario: Limpar validade mantém o estado
- **WHEN** um admin envia `PUT /api/posts/:id` com `expiresAt: ""` em um comunicado publicado e expirado
- **THEN** o sistema limpa `expiresAt` (retorna `null`), `expired` passa a `false` e o comunicado continua publicado