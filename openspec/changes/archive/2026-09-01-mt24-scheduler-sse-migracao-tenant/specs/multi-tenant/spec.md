## MODIFIED Requirements

### Requirement: Entidades de dados têm tenantId

Todos os models de dados (`User`, `Group`, `Comunicado`, `Interaction`) DEVERÃO (SHALL) ter um campo `tenantId` que referencia o tenant. Após a migração de dados (MT-24), o escopo DEVE (SHALL) ser estrito: um documento só é acessível quando o `tenantId` casa com o tenant resolvido da requisição; documentos com `tenantId = null` **NÃO** são casados em leitura nem em escrita (a ponte de transição `null` é removida). O campo continua aceitando `null` no schema (default), mas um documento `null` não é elegível para nenhum tenant.

#### Scenario: Usuário criado sem tenantId

- **WHEN** um usuário é criado sem informar `tenantId`
- **THEN** o documento é salvo com `tenantId = null`, mas sob escopo estrito não é retornado/elegível para nenhuma leitura ou escrita de tenant

#### Scenario: Documento legado null não é acessível

- **WHEN** um documento (`Comunicado`/`Group`/`Interaction`/`User`) tem `tenantId = null` e uma requisição de um tenant qualquer consulta ou busca dados
- **THEN** o documento NÃO é retornado nem elegível em nenhuma leitura/escrita (escopo estrito; a ponte `null` foi removida)

## ADDED Requirements

### Requirement: Scheduler libera e expira comunicados apenas do tenant

O scheduler (I-01/I-05) DEVE (SHALL) liberar publicações agendadas (`publishAt`) e sinalizar comunicados expirados (`expiresAt`) somente para comunicados do tenant. `reconcile()` e o sweep de expiração DEVERÃO (SHALL) iterar por tenant, filtrando os comunicados pendentes/vencidos por `tenantId`.

#### Scenario: Liberação de agendado escopada ao tenant

- **WHEN** o `reconcile()` do scheduler executa e há um comunicado agendado de um tenant
- **THEN** apenas esse comunicado é liberado (`published: true`) e o evento `post:new` do seu tenant é emitido

#### Scenario: Programa de expiração escopado ao tenant

- **WHEN** o sweep de expiração executa e há comunicados expirados de vários tenants
- **THEN** cada comunicado expirado é sinalizado como `post:expired` com o `tenantId` do seu próprio tenant

### Requirement: Migração associa dados existentes ao tenant default

O sistema DEVE (SHALL) prover um script de migração que cria o tenant default (se ausente) e associa todos os dados existentes (`User`, `Group`, `Comunicado`, `Interaction`, `Category`) com `tenantId` nulo/ausente ao tenant default, sem perda de dados.

#### Scenario: Migração atribui documentos ao tenant default

- **WHEN** o script de migração é executado e existem documentos com `tenantId = null`/ausente
- **THEN** todos esses documentos passam a ter `tenantId = <default>` e nenhum dado é perdido

#### Scenario: Migração idempotente

- **WHEN** o script de migração é executado novamente após a primeira execução
- **THEN** nenhum documento é duplicado nem desassociado (execução segura/repetível)

### Requirement: Seed cria o tenant default e escopa os inserts

O `npm run seed` DEVE (SHALL) criar o tenant default (idempotente — não duplica entre execuções) e gravar `tenantId` do tenant default em todos os inserts (admin, grupos, colaboradores, comunicados, categorias).

#### Scenario: Seed idempotente com tenant default

- **WHEN** o seed é executado duas vezes seguidas
- **THEN** o tenant default é criado uma única vez e todos os inserts ficam escopados a ele.
