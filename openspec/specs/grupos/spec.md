## Purpose

API de grupos do Interact, escopada por tenant: listar, criar e editar grupos dentro do escopo da
instância, com nome de grupo único por tenant.

## Requirements

### Requirement: Listar grupos somente do tenant
O sistema SHALL retornar, em `GET /api/groups`, somente os grupos do tenant resolvido na
requisição (incluindo os legados `tenantId: null` durante a transição MT-24).

#### Scenario: Admin lista os grupos do seu tenant
- **WHEN** um admin autenticado do tenant A chama `GET /api/groups`
- **THEN** a resposta contém somente os grupos cujo `tenantId` é o tenant A (ou `null`, legado)
- **AND** grupos de outros tenants não aparecem na listagem

### Requirement: Criar grupo persistindo o tenant
O sistema SHALL persistir o `tenantId` do tenant resolvido ao criar um grupo via `POST /api/groups`,
e a checagem de nome duplicado SHALL ser feita dentro do escopo do tenant.

#### Scenario: Admin cria grupo no seu tenant
- **WHEN** um admin do tenant A envia `POST /api/groups` com `name: "financeiro"`
- **THEN** o sistema cria o grupo com `tenantId` = tenant A e responde 201 com `{ id, name, active }`
- **AND** o grupo passa a ser visível somente para o tenant A

#### Scenario: Nome duplicado dentro do mesmo tenant
- **WHEN** um admin do tenant A tenta criar um grupo com um `name` que já existe no tenant A
- **THEN** o sistema responde 400 com mensagem de grupo já existente

#### Scenario: Nome igual em tenants diferentes é permitido
- **WHEN** um admin do tenant A tenta criar um grupo com um `name` que já existe no tenant B
- **THEN** o sistema cria o grupo normalmente (sem 400), pois o nome é único **por tenant**

### Requirement: Editar grupo somente dentro do tenant
O sistema SHALL permitir editar um grupo via `PUT /api/groups/:id` somente se o grupo pertencer ao
tenant resolvido (cross-tenant → `404`), e a checagem de duplicidade de nome SHALL respeitar o tenant.

#### Scenario: Admin edita grupo do seu tenant
- **WHEN** um admin do tenant A envia `PUT /api/groups/:id` para um grupo do tenant A
- **THEN** o sistema aplica a alteração de nome/ativo e responde 200

#### Scenario: Admin tenta editar grupo de outro tenant
- **WHEN** um admin do tenant A envia `PUT /api/groups/:id` para um grupo que pertence ao tenant B
- **THEN** o sistema responde 404 (nenhum)

#### Scenario: Renomear para nome que existe em outro tenant é permitido
- **WHEN** um admin do tenant A renomeia um grupo para um `name` que já existe no tenant B
- **THEN** o sistema renomeia sem 400, pois a duplicidade é checada dentro do tenant A

### Requirement: Contagem de destinatários por tenant
O endpoint `POST /api/groups/recipient-count` SHALL contar os usuários/destinatários somente dentro
do tenant resolvido.

#### Scenario: Contagem de broadcast escopada por tenant
- **WHEN** um admin do tenant A envia `POST /api/groups/recipient-count` com `targetGroups: []`
- **THEN** o sistema conta somente os colaboradores do tenant A (não admins)
- **AND** colaboradores de outros tenants não são contabilizados

#### Scenario: Contagem de grupos direcionados escopada por tenant
- **WHEN** um admin do tenant A envia `POST /api/groups/recipient-count` com `targetGroups: [g1]`
- **THEN** o sistema conta somente os colaboradores do tenant A que pertencem aos grupos informados
- **AND** colaboradores de outros tenants não são contabilizados
