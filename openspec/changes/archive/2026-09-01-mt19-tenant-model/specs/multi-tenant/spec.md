## Purpose

Isolar cada cliente/empresa em um **tenant** no backend multi-tenant (SaaS), provendo um modelo de Tenant e a resolução canônica do tenant de cada requisição (`req.tenant`) que servirá de base para todo o escopo por tenant (MT-20…MT-24, #17, I-08).

## ADDED Requirements

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
