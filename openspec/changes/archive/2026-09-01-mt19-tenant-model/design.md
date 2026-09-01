## Context

Ver `proposal.md` para a motivação. Estado atual relevante: o backend é single-DB (`MONGODB_URI`, `src/db/connection.js`), monta as rotas via `app.use("/api", routes)` (`src/app.js`), o `auth` middleware injeta `req.user` por rota (`src/middleware/auth.js`) e o login consulta `User.findOne({ email })` (`src/routes/auth.js`). Não existe hoje nenhum conceito de tenant. Este change introduz o substrato: modelo `Tenant` + resolução canônica do tenant por requisição, sem ainda escopar os dados (MT-20…MT-24).

## Goals / Non-Goals

**Goals:**
- Prover `req.tenant`/`req.tenantId` em todas as rotas `/api`, resolvidos na precedência header → subdomínio → claim do JWT.
- Modelo `Tenant` com os campos necessários e exposição mínima (consulta/resolução) + criação do tenant default no seed.
- Fallback de dev (`DEFAULT_TENANT_SLUG`) que **não quebra** as rotas atuais (comportamento preservado localmente).

**Non-Goals:**
- Adicionar `tenantId` aos models `User/Group/Comunicado/Interaction` (→ MT-20).
- Incluir `tenantId` no payload do JWT nem validar pertencimento do usuário ao tenant (→ MT-21).
- Escopar posts/grupos/interações/categorias por tenant (→ MT-22/23).
- Scheduler, SSE por tenant e migração de dados existentes (→ MT-24).
- Mudar para multi-DB (mantém single-DB, decisão D2).

## Decisions

### D-M1: Ordem de precedência e fonte de configuração
Resolver por: **`X-Tenant-Id`/`X-Tenant-Slug`** → **subdomínio de `req.hostname`** → **claim `tenantId`** (quando `req.user` já existir). Alternativa considerada: apenas subdomínio (mais simples, mas menos flexível para headers de admin/APIs/testes). Mantém-se a cadeia para atender admin (que pode enviar header) e autenticado (claim).

### D-M2: Middleware permissivo (nunca bloqueia por falta de tenant)
`resolveTenant` NÃO retorna erro quando não encontra tenant: usa o **tenant default** via env `DEFAULT_TENANT_SLUG` (cache em memória) em ambiente não-produção, ou deixa `req.tenant = null` em produção. Isso garante que rotas públicas (ex.: login) continuem funcionando e nenhuma rota atual quebre em dev. Alternativa considerada: rejeitar com 401/404 quando tenant ausente — descartada por quebrar o ambiente local e o login (rota pública).

### D-M3: Módulo único `tenant.js` (helper + middleware)
Um único módulo `src/middleware/tenant.js` exporta:
- `resolveTenant(req)` — função assíncrona pura que retorna o documento (ou null), implementando a cadeia.
- `resolveTenantMiddleware(req, res, next)` — aplica `resolveTenant`, seta `req.tenant`/`req.tenantId` e faz o fallback de dev.
Reutilizável tanto no mount global quanto (futuramente) dentro de `auth` para o caso de claim — evita duplicação.

### D-M4: Wiring no escopo `/api`
Montar como `app.use("/api", resolveTenantMiddleware, routes)` em `src/app.js`, **antes** dos sub-routers. Como `resolveTenant` roda antes do `auth` (que é por rota), a branch da claim do JWT só terá efeito quando `req.user` já estiver presente — isso é complementado no MT-21 (que adiciona `tenantId` ao payload do JWT e pode re-invocar `resolveTenant`). Para MT-19, o mecanismo da cadeia fica pronto; a claim passa a resolver efetivamente com o `tenantId` adicionado no MT-21.

### D-M5: Exposição mínima do Tenant
`src/routes/tenants.js` com `GET /api/tenants` (lista, admin) e `GET /api/tenants/resolve` (retorna o tenant resolvido da requisição). Mantém o modelo consultável sem ampliar o contrato de features existentes.

### D-M6: Seed do tenant default
No `src/db/seed.js`, criar o tenant definido por `DEFAULT_TENANT_SLUG` (default `"interna"`) se ainda não existir, antes de popular os dados. Consistente com o fallback de dev.

## Risks / Trade-offs

- **[Cadeia de precedência ambígua com JWT]** — o middleware global roda antes de `auth`, então a claim do JWT só é utilizável após `auth` re-resolver (MT-21). → Mitigação: M3 mantém `resolveTenant` reutilizável e documenta que a claim se completa no MT-21; o comportamento de header/subdomínio (que é o foco da MT-19) funciona de imediato.
- **[Colisão de `slug`/`subdomain`]** — pedidos a um tenant inexistente não devem falhar silenciosamente em produção. → Mitigação: `active` + validação de unicidade no modelo; em produção sem tenant, `req.tenant = null` (rotas públicas seguem; roteamento por tenant explícito virá com os escopos MT-20+).
- **[Aumento de latência por consulta de tenant]** — resolver o tenant a cada request faz 1 query. → Mitigação: cache em memória por `slug`/`subdomain`/`id` (TTL curto ou invalidado no update) para o tenant default e frequentes; otimização adiada sem alterar o contrato.
- **[Change grande de escopo]**: risco de vazar para MT-21/22. → Mitigação: non-goals explícitos + critérios de aceite estritos; qualquer escopo de dados é rejeitado neste change.

## Migration Plan

Sem migração de dados existentes (MT-24 cuida disso). Rollback: remover o middleware e o model; o fallback de dev garante que a remoção não exige alterar rotas. Documentar que o `seed` cria o tenant default de forma idempotente (não duplica).
