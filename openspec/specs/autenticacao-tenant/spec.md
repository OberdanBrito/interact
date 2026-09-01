# autenticacao-tenant Specification

## Purpose
Garante que a autenticação (login e requests autenticados) seja escopada por tenant, impedindo que um usuário de uma instância autentique em outra — o mesmo e-mail pode existir em tenants distintos, mas cada login só vale no tenant do usuário.

## Requirements

### Requirement: O JWT emitido no login carrega tenantId

Ao autenticar, o sistema DEVE emitir um token JWT cujo payload inclui `tenantId` igual ao id do tenant resolvido na requisição (`req.tenantId`).

#### Scenario: Login no tenant A

- **WHEN** um usuário faz login em `POST /api/auth/login` no contexto do tenant A (via `X-Tenant-Slug`)
- **THEN** o token retornado contém `tenantId` com o id do tenant A

### Requirement: Login autentica apenas dentro do tenant resolvido

O login DEVE buscar o usuário por `email` **e** `tenantId` (o tenant resolvido por header/subdomínio), de modo que um e-mail pertencente a um tenant não autentique no contexto de outro tenant.

#### Scenario: Login de e-mail de outro tenant é rejeitado

- **WHEN** um usuário existe no tenant A com o e-mail `a@x.com` e uma requisição de login usa `a@x.com` no contexto do tenant B (via `X-Tenant-Slug: b`)
- **THEN** a autenticação falha com **401 "Credenciais inválidas"** (nenhum usuário de B corresponde ao e-mail no tenant B)

#### Scenario: Login do mesmo e-mail no tenant correto

- **WHEN** o mesmo e-mail `a@x.com` faz login no contexto do tenant A ao qual pertence
- **THEN** a autenticação é bem-sucedida e o token carrega o `tenantId` do tenant A

### Requirement: Usuários legados autenticam durante a transição

Enquanto dados legados ainda têm `tenantId = null` (antes do backfill da MT-24), o login DEVE aceitar usuários com `tenantId` igual ao tenant resolvido **ou** `null`, para não quebrar autenticação de registros ainda não migrados.

#### Scenario: Usuário legado autentica no default

- **WHEN** um usuário com `tenantId = null` e o e-mail `admin@x.com` faz login no contexto do tenant default (resolvido por `DEFAULT_TENANT_SLUG`)
- **THEN** a autenticação é bem-sucedida (o usuário legado é tratado como pertencente ao tenant default)

### Requirement: Requests autenticados validam o pertencimento ao tenant resolvido

O middleware de autenticação DEVE rejeitar requisições autenticadas cujo `tenantId` do token (`req.user.tenantId`) não coincida com o tenant resolvido (`req.tenantId`), retornando **403**.

#### Scenario: Token de outro tenant é rejeitado

- **WHEN** uma requisição autenticada com um token do tenant A chega com `X-Tenant-Slug: b` (tenant B resolvido)
- **THEN** a requisição é rejeitada com **403** antes de executar a lógica da rota

#### Scenario: Token do mesmo tenant é aceito

- **WHEN** uma requisição autenticada com um token do tenant A chega em um contexto que resolve para o tenant A (header, subdomínio ou claim)
- **THEN** a requisição prossegue normalmente
