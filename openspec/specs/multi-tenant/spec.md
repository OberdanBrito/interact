# multi-tenant Specification

## Purpose

Isolar cada cliente/empresa em um **tenant** no backend multi-tenant (SaaS), provendo um modelo de Tenant e a resolução canônica do tenant de cada requisição (`req.tenant`) que servirá de base para todo o escopo por tenant (MT-20…MT-24, #17, I-08).

## Requirements

### Requirement: O sistema tem um modelo de Tenant

O sistema DEVE armazenar tenants com um identificador único, `slug` único, `name`, `subdomain`/`domain`, `settings` (objeto flexível), `plan` e `active`. O tenant default de dev DEVE poder ser criado via seed e consultado via API.

#### Scenario: Criar e consultar tenant via seed

- **WHEN** o seed é executado com um `DEFAULT_TENANT_SLUG` configurado e não existe tenant com esse slug
- **THEN** um tenant ativo com esse slug é criado e fica disponível em `GET /api/tenants`

### Requirement: Resolução do tenant por header

O sistema DEVE resolver o tenant a partir do header `X-Tenant-Id` ou `X-Tenant-Slug` quando eles identificam um tenant ativo.

#### Scenario: Header X-Tenant-Slug identifica um tenant ativo

- **WHEN** uma requisição chega com `X-Tenant-Slug: acme` e existe um tenant ativo com `slug: "acme"`
- **THEN** `req.tenant` é o tenant `acme` e `req.tenantId` é o seu id

### Requirement: Resolução do tenant por subdomínio

O sistema DEVE resolver o tenant a partir do subdomínio do host (`req.hostname`) quando ele corresponde ao `subdomain` de um tenant ativo e nenhum header de tenant está presente.

#### Scenario: Subdomínio acme.interact.app

- **WHEN** uma requisição chega em `acme.interact.app` sem header de tenant e existe um tenant ativo com `subdomain: "acme"`
- **THEN** `req.tenant` é o tenant `acme`

### Requirement: Resolução do tenant por claim do JWT

O sistema DEVE resolver o tenant a partir da claim `tenantId` do JWT (`req.user.tenantId`) quando presente e nenhum header/subdomínio identifica um tenant.

#### Scenario: JWT autenticado com tenantId

- **WHEN** uma requisição autenticada (token com `tenantId` de um tenant ativo) não traz header nem subdomínio correspondente
- **THEN** `req.tenant` é o tenant correspondente à claim

### Requirement: Precedência na resolução do tenant

A resolução DEVE seguir a ordem: header (`X-Tenant-Id`/`X-Tenant-Slug`) → subdomínio do host → claim `tenantId` do JWT. Uma fonte de maior precedência vence uma de menor.

#### Scenario: Header vence o subdomínio

- **WHEN** a requisição chega em `acme.interact.app` com `X-Tenant-Slug: beta`
- **THEN** `req.tenant` é o tenant `beta` (header vence o subdomínio)

### Requirement: Fallback para tenant default em desenvolvimento

Quando nenhuma fonte identifica um tenant, o sistema DEVE resolver um tenant default a partir do env `DEFAULT_TENANT_SLUG` (cache em memória) e NÃO bloquear a requisição, preservando o comportamento atual no ambiente local.

#### Scenario: Sem fonte de tenant em dev

- **WHEN** uma requisição chega sem header, sem subdomínio conhecido e sem claim de tenant, e o env `DEFAULT_TENANT_SLUG` está configurado (ambiente não-produção)
- **THEN** `req.tenant` é o tenant default e a requisição prossegue normalmente (nenhuma rota atual quebra)

### Requirement: req.tenant disponível em todas as rotas /api

O sistema DEVE injetar o tenant resolvido em todas as rotas sob `/api`, de modo que `req.tenant` (documento) e `req.tenantId` (id) estejam definidos antes da execução dos sub-routers.

#### Scenario: Rota autenticada acessa req.tenant

- **WHEN** uma requisição chega a qualquer rota `/api` (ex.: `GET /api/posts`)
- **THEN** `req.tenantId` está definido e é o id do tenant resolvido (via resolução ou fallback)

### Requirement: Entidades de dados têm tenantId

Todos os models de dados (`User`, `Group`, `Comunicado`, `Interaction`) DEVERÃO (SHALL) ter um campo `tenantId` que referencia o tenant. Após a migração de dados (MT-24), o escopo DEVE (SHALL) ser estrito: um documento só é acessível quando o `tenantId` casa com o tenant resolvido da requisição; documentos com `tenantId = null` **NÃO** são casados em leitura nem em escrita (a ponte de transição `null` é removida). O campo continua aceitando `null` no schema (default), mas um documento `null` não é elegível para nenhum tenant.

#### Scenario: Usuário criado sem tenantId

- **WHEN** um usuário é criado sem informar `tenantId`
- **THEN** o documento é salvo com `tenantId = null`, mas sob escopo estrito não é retornado/elegível para nenhuma leitura ou escrita de tenant

#### Scenario: Documento legado null não é acessível

- **WHEN** um documento (`Comunicado`/`Group`/`Interaction`/`User`) tem `tenantId = null` e uma requisição de um tenant qualquer consulta ou busca dados
- **THEN** o documento NÃO é retornado nem elegível em nenhuma leitura/escrita (escopo estrito; a ponte `null` foi removida)

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
