## ADDED Requirements

### Requirement: Comunicados são escopados por tenant

O sistema SHALL escopar todas as operações de `/api/posts` (listagem, detalhe, criação, edição,
exclusão e anexos) pelo tenant resolvido da requisição (`req.tenantId`), de modo que um
comunicado de uma instância não seja legível por outra. Durante a transição (até o backfill da
MT-24), comunicados legados com `tenantId` nulo permanecem visíveis/elegíveis para qualquer
contexto sem tenant próprio, preservando o comportamento atual de dev/QA. Comunicados com
`tenantId` definido de um tenant diferente **NUNCA** são expostos a outro tenant.

#### Scenario: Admin lista apenas comunicados do seu tenant

- **WHEN** um admin autenticado em um tenant chama `GET /api/posts`
- **THEN** a resposta contém apenas comunicados cujo `tenantId` corresponde ao tenant do admin
- **AND** nenhum comunicado de outro tenant aparece

#### Scenario: Colaborador lista apenas comunicados do seu tenant

- **WHEN** um colaborador autenticado em um tenant chama `GET /api/posts`
- **THEN** a resposta contém apenas comunicados elegíveis dentro do seu tenant (nunca de outro)

#### Scenario: Detalhe de comunicado de outro tenant não é exposto

- **WHEN** um usuário autenticado em um tenant chama `GET /api/posts/:id` de um comunicado cujo
  `tenantId` pertence a outro tenant
- **THEN** o sistema responde `404` (não `403`), sem revelar a existência do comunicado

#### Scenario: Criar comunicado registra o tenant

- **WHEN** um admin autenticado em um tenant cria um comunicado via `POST /api/posts`
- **THEN** o comunicado é persistido com `tenantId` igual ao tenant resolvido da requisição

#### Scenario: Editar comunicado de outro tenant não é exposto

- **WHEN** um admin autenticado em um tenant envia `PUT /api/posts/:id` para um comunicado de
  outro tenant
- **THEN** o sistema responde `404` e não aplica a alteração

#### Scenario: Excluir comunicado de outro tenant não é exposto

- **WHEN** um admin autenticado em um tenant envia `DELETE /api/posts/:id` para um comunicado de
  outro tenant
- **THEN** o sistema responde `404` e não exclui o comunicado

#### Scenario: Anexos de comunicado de outro tenant não são expostos

- **WHEN** um usuário autenticado em um tenant consulta `GET /api/posts/:id/attachments/:attachmentId`
  de um comunicado de outro tenant
- **THEN** o sistema responde `404` (mesma visibilidade do comunicado, que não é elegível)

### Requirement: isPostEligible considera o tenant do comunicado

O helper de elegibilidade SHALL considerar o `tenantId` do documento como pré-condição: um
comunicado só é elegível para um usuário se o `tenantId` do documento corresponder ao `tenantId`
do usuário (ou se ambos forem o caso de transição com `tenantId` nulo). Comunicados de outro
tenant nunca são elegíveis.

#### Scenario: Comunicado de outro tenant não é elegível

- **WHEN** um usuário autenticado acessa um comunicado cujo `tenantId` difere do seu
- **THEN** o comunicado não é elegível e o acesso retorna `404`

#### Scenario: Comunicado legado (tenantId nulo) permanece elegível na transição

- **WHEN** um usuário autenticado acessa um comunicado legado com `tenantId` nulo (anterior à
  migração da MT-24)
- **THEN** o comunicado permanece elegível, preservando o comportamento atual de dev/QA

#### Scenario: Comunicado do mesmo tenant é elegível

- **WHEN** um usuário autenticado acessa um comunicado cujo `tenantId` corresponde ao seu
- **THEN** o comunicado é elegível e as demais regras de visibilidade (grupo, expiração, estado)
  continuam valendo

### Requirement: IDs de comunicado são gerados como UUID

O sistema SHALL gerar o `_id` de um novo comunicado como um UUID (via `crypto.randomUUID()`),
em vez de uma sequência global (`p01/p02`), de modo que IDs não colidam entre tenants. Os IDs
históricos (ex.: `p01`) permanecem válidos; apenas a geração de novos comunicados muda para UUID.
O campo `id` exposto no payload continua sendo uma string.

#### Scenario: Criar comunicado gera id UUID

- **WHEN** um admin cria um comunicado via `POST /api/posts`
- **THEN** o comunicado é persistido com um `_id` em formato UUID (hash hexadeci­mal no padrão
  `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- **AND** o payload retorna esse `id` como string

#### Scenario: IDs não colidem entre tenants

- **WHEN** dois tenants diferentes criam comunicados independentes
- **THEN** os `id` gerados são distintos (UUID), sem reutilização de sequência compartilhada

#### Scenario: IDs históricos permanecem válidos

- **WHEN** um administrador consulta um comunicado criado antes da migração (id no formato `pNN`)
- **THEN** o comunicado continua acessível pelo seu `id` e o payload retorna `id: "pNN"`
