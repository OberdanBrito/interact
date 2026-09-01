## ADDED Requirements

### Requirement: Escopar interações e métricas por tenant
O sistema SHALL manter as interações (`Interaction`) escopadas pelo `tenantId`: o upsert grava o
tenant do colaborador, as leituras (`/me`, `/members`, `/summary`, `GET /`, `GET /:postId`) filtram
por tenant, e a elegibilidade de interagir com um comunicado inclui pré-condição de tenant
(cross-tenant não é elegível).

#### Scenario: Upsert de interação grava o tenant do usuário
- **WHEN** um colaborador do tenant A envia `PUT /api/interactions/:postId` com `read: true`
- **THEN** o sistema persiste (via upsert) a interação com `tenantId` = tenant A
- **AND** responde 200 com `{ postId, liked, read }`

#### Scenario: Colaborador não interage com comunicado de outro tenant
- **WHEN** um colaborador do tenant A tenta interagir (`PUT /api/interactions/:postId`) com um
  comunicado que pertence ao tenant B
- **THEN** o sistema responde 404 (sem revelar a existência do comunicado)

#### Scenario: Colaborador consulta o próprio estado sem vazar dados
- **WHEN** um colaborador do tenant A chama `GET /api/interactions/me`
- **THEN** a resposta contém somente as interações do colaborador no escopo do tenant A

### Requirement: Agregados de métricas não vazam entre tenants
Os endpoints de métricas do admin (`GET /api/interactions/members`, `/summary`, `GET /` e
`GET /:postId`) SHALL agregar somente as interações do tenant resolvido, sem contabilizar dados de
outras instâncias.

#### Scenario: Admin consulta quem leu dentro do tenant
- **WHEN** um admin do tenant A consulta `GET /api/interactions/members?postId=X`
- **THEN** a resposta lista somente as interações do tenant A no comunicado X
- **AND** interações de colaboradores de outros tenants não aparecem

#### Scenario: Summary do admin escopado por tenant
- **WHEN** um admin do tenant A consulta `GET /api/interactions/summary`
- **THEN** o sistema agrega somente as interações do tenant A
- **AND** métricas de outros tenants não são contabilizadas

#### Scenario: Agregado por comunicado escopado por tenant
- **WHEN** um admin do tenant A consulta `GET /api/interactions?postId=X`
- **THEN** o sistema agrega somente as interações do tenant A no comunicado X
- **AND** o mapeamento de nomes de grupos considera apenas os grupos do tenant A

#### Scenario: Detalhe do comunicado escopado por tenant
- **WHEN** um admin do tenant A consulta `GET /api/interactions/:postId`
- **THEN** o sistema agrega somente as interações do tenant A naquele comunicado
