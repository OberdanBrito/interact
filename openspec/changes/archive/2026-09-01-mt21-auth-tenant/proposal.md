# MT-21 — Backend: auth e login por tenant

## Why

Com `tenantId` já presente nos models (MT-20), a autenticação ainda é global: `POST /api/auth/login` busca `User.findOne({ email })` e o JWT não carrega o tenant do usuário. Isso permite que o mesmo e-mail num tenant B autentique com os dados do tenant A, e é a última lacuna para o login ficar isolado por instância no SaaS.

## What Changes

- **`tenantId` no payload do JWT**: o token passa a carregar `{ id, email, name, role, tenantId }`, onde `tenantId` é o id do tenant resolvido na requisição (`req.tenantId`).
- **Login escopado por tenant**: `POST /api/auth/login` passa a buscar `User.findOne({ email, tenantId })` em vez de só `{ email }`. O tenant vem da resolução de `req.tenantId` (header `X-Tenant-Id`/`X-Tenant-Slug` ou subdomínio, já implementada na MT-19).
- **Validação de pertencimento no `auth.js`**: o middleware passa a rejeitar requisições cujo `req.user.tenantId` (claim do JWT) não coincida com o tenant resolvido `req.tenantId`, retornando **403**.
- **Ponte de transição (legacy)**: enquanto os dados legados ainda estão com `tenantId: null` (backfill é a MT-24), o login aceita usuários com `tenantId` igual ao tenant resolvido **ou** `null`, para não quebrar autenticação de registros ainda não migrados. No tenant default criado pelo seed isso é transparente.

> **NOTA (MTO-24)**: a ponte `null` será removida quando a MT-24 associar os dados existentes ao tenant correto. Não é BREAKING: para usuários já com `tenantId` definido, a regra de isolamento por tenant vale imediatamente.

## Capabilities

### New Capabilities

- `autenticacao-tenant`: cobre o escopo de autenticação por tenant — JWT com `tenantId`, login que valida pertencimento ao tenant resolvido e verificação de pertencimento nos requests autenticados.

### Modified Capabilities

- (nenhuma — a capability `multi-tenant` existente não muda; a resolução de tenant já está coberta lá)

## Impact

- `src/routes/auth.js`: busca de usuário por `email + tenantId`, `tenantId` no `jwt.sign`, ajuste da resposta.
- `src/middleware/auth.js`: validação `req.user.tenantId !== req.tenantId` → 403.
- `src/app.js`: ordem atual (`resolveTenantMiddleware` antes do router) já garante `req.tenantId` disponível no `auth.js`. Sem mudança necessária.
- **Compatibilidade (não-BREAKING)**: QA/integration e dev continuam autenticando usuários legados `tenantId: null` graças à ponte. Usuários de tenants distintos passam a ser isolados.
- Novo script de QA: `scripts/qa-i21.mjs` (integração, Mongo real) cobrindo os 3 critérios de aceite, adicionado a `test:integration`.
