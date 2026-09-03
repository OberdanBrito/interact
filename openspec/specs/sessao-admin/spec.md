# sessao-admin Specification

## Purpose

Autenticação de sessão do painel admin por tenant: identifica o tenant a partir do host, isola o armazenamento por tenant, associa a sessão ao tenant autenticado e envia a identidade do tenant em cada requisição autenticada.

## Requirements

### Requirement: Resolver o tenant do host no bootstrap

O painel admin DEVE (SHALL) resolver o tenant a partir do hostname (subdomínio) no bootstrap, antes de restaurar a sessão, definindo o slug do tenant corrente. Sem subdomínio (ambiente de dev), DEVE (SHALL) usar um fallback para o tenant default.

#### Scenario: Subdomínio define o tenant

- **WHEN** o admin é aberto em `acme.interact.app`
- **THEN** o tenant corrente tem `slug = "acme"`

#### Scenario: Sem subdomínio usa o fallback de dev

- **WHEN** o admin é aberto em `localhost` (dev) sem subdomínio
- **THEN** o tenant corrente usa o slug default de dev

### Requirement: Sessão e storage isolados por tenant

O painel DEVE (SHALL) armazenar a sessão em uma chave composta pelo tenant, de modo que dois tenants no mesmo browser não sobrescrevam a sessão um do outro.

#### Scenario: Dois tenants não sobrescrevem

- **WHEN** um admin loga no tenant A e, no mesmo browser, loga no tenant B
- **THEN** a sessão do tenant A permanece intacta e a do tenant B é independente (chaves distintas)

### Requirement: Login associa o tenant e injeta tenantId na sessão

O login DEVE (SHALL) identificar o tenant corrente e gravar na sessão o `tenantId` do usuário autenticado; as requisições autenticadas DEVERÃO (SHALL) enviar a identidade do tenant (via header `X-Tenant-Id`).

#### Scenario: Login guarda tenantId e requests enviam a identidade

- **WHEN** um admin autentica no tenant A e a sessão é persistida
- **THEN** a sessão contém o `tenantId` de A e as requisições autenticadas subsequentes enviam `X-Tenant-Id: <tenantId>`

### Requirement: Restauração de sessão valida o pertencimento

O painel DEVE (SHALL) restaurar a sessão somente se ela pertence ao tenant corrente; uma sessão de outro tenant DEVE (SHALL) ser descartada, forçando nova autenticação.

#### Scenario: Sessão do tenant errado é descartada

- **WHEN** a sessão persistida pertence ao tenant B e o painel é aberto no tenant A
- **THEN** a sessão é descartada e o usuário é levado ao login (não autenticado)

#### Scenario: Sessão do tenant correto é restaurada

- **WHEN** a sessão persistida pertence ao tenant corrente e contém um token
- **THEN** o usuário é restaurado (autenticado) sem novo login
