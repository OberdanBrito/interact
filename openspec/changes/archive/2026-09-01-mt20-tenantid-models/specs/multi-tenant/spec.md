## ADDED Requirements

### Requirement: Entidades de dados têm tenantId

Todos os models de dados (`User`, `Group`, `Comunicado`, `Interaction`) DEVERÃO ter um campo `tenantId` que referencia o tenant. O campo DEVE aceitar `null` (default) para preservar o comportamento atual até a migração de dados (MT-24).

#### Scenario: Usuário criado sem tenantId

- **WHEN** um usuário é criado sem informar `tenantId`
- **THEN** o documento é salvo com `tenantId = null` e nenhuma rota atual falha

### Requirement: E-mail é único por tenant

O sistema DEVE garantir que um `email` seja único dentro de um tenant, mas o MESMO e-mail pode existir em tenants diferentes.

#### Scenario: Mesmo e-mail em tenants diferentes

- **WHEN** existem dois tenants (`acme`, `beta`) e um usuário é criado com `email: "a@x.com"` e `tenantId: <acme>`
- **THEN** um usuário com `email: "a@x.com"` e `tenantId: <beta>` pode ser criado sem conflito

#### Scenario: Duplicar e-mail no mesmo tenant

- **WHEN** um segundo usuário é criado com o mesmo `email` e o mesmo `tenantId`
- **THEN** a operação falha por violação do índice único `{ email, tenantId }`

### Requirement: Nome de grupo é único por tenant

O sistema DEVE garantir que o `name` de um grupo seja único dentro de um tenant, mas o MESMO nome pode existir em tenants diferentes.

#### Scenario: Mesmo nome de grupo em tenants diferentes

- **WHEN** existem dois tenants e um grupo `nome: "Operações"` é criado para cada um
- **THEN** ambos podem existir sem conflito

#### Scenario: Duplicar nome de grupo no mesmo tenant

- **WHEN** um segundo grupo com o mesmo `name` é criado no mesmo tenant
- **THEN** a operação falha por violação do índice único `{ name, tenantId }`

### Requirement: Índices de comunicados e interações partirão do tenantId

Os índices de comunicação (`Comunicado`, `Interaction`) DEVERÃO ser prefixados por `tenantId`, de modo a suportar consultas isoladas por tenant.

#### Scenario: Consulta de comunicados por tenant

- **WHEN** o sistema consulta comunicados filtrando por `tenantId`
- **THEN** a consulta usa um índice começando por `tenantId` (ex.: `{ tenantId, published, dateISO }`)

#### Scenario: Interação única por tenant

- **WHEN** o sistema registra uma interação para um `postId`/`userId`
- **THEN** a unicidade é garantida pelo índice composto `{ tenantId, postId, userId }`
