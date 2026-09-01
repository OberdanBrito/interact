# Design — MT-21: auth e login por tenant

## Context

A MT-19 entregou `req.tenant`/`req.tenantId` em todas as rotas `/api` (via `resolveTenantMiddleware`, precedência header → subdomínio → claim → fallback default). A MT-20 adicionou `tenantId` aos models (`User`, `Group`, `Comunicado`, `Interaction`) com índice único `{ email, tenantId }`, mas com os dados ainda em `tenantId: null` (o backfill é a MT-24). Hoje `POST /api/auth/login` busca o usuário somente por `email` e o JWT não carrega o tenant; `auth.js` também não valida pertencimento.

Este trabalho escopa a autenticação por tenant sem tocar a resolução (já pronta) e sem realizar o backfill (escopo da MT-24).

## Goals / Non-Goals

**Goals:**
- Incluir `tenantId` no payload do JWT emitido no login.
- Buscar o usuário no login por `email + tenantId` (tenant resolvido), isolando instâncias.
- Validar no `auth.js` que o token pertence ao tenant resolvido (403 quando não pertence).
- Preservar autenticação dos dados legados (`tenantId: null`) durante a transição.
- Cobrir os 3 critérios de aceite com um QA de integração dedicado.

**Non-Goals:**
- Associar dados existentes ao tenant (`tenantId` dos registros legados) — MT-24.
- Escopar as demais rotas (posts/groups/interactions) por query de `tenantId` — isto é comportamento de consultas isoladas, coberto nas MTs seguintes (MT-23/MT-24).
- Particionamento de uploads por tenant (MT-22).
- Mudanças no `frontend_admin`/`frontend_pwa` (passam a enviar header de tenant nas MTs de frontend).

## Decisions

### D1: `tenantId` no JWT vem de `req.tenantId` (não do user)

No login, `tenantId` do token é `req.tenantId ? String(req.tenantId) : null`.

- **Por quê:** o usuário é identificado por `email + tenantId`, e o tenant é o `req.tenantId` resolvido. Usar o valor do documento (`user.tenantId`) seria `null` para legados, perdendo a associação ao tenant default; usar `req.tenantId` mantém o token sempre coerente com o contexto de autenticação. Em dev/default, `req.tenantId` = id do tenant `interna`; em QA sem tenant, `req.tenantId` = `null` (o token fica com `null`, mantendo o comportamento atual dos scripts de integration).
- **Alternativas:** usar `user.tenantId`. Rejeitado porque, com dados legados `null`, o token sairia sem tenant mesmo quando o login ocorre no tenant default.

### D2: Login busca `email + tenantId` com ponte `$or` para `null`

```js
User.findOne({
  email: email.toLowerCase(),
  $or: [{ tenantId: req.tenantId }, { tenantId: null }],
})
```

- **Por quê:** garante o critério #2 (um e-mail que pertence apenas ao tenant A não autentica no tenant B: a query no contexto B busca `{tenantId: B}` ou `{tenantId:null}`, e o usuário de A tem `tenantId: A` → não casa). Ao mesmo tempo, a cláusula `{tenantId: null}` preserva o acesso dos registros legados (QA/integration e dev antes do backfill).
- **Por que a ponte não fura o isolamento:** usuários legados têm `tenantId: null` e, pelo índice único `{email, tenantId}`, só pode existir **um** usuário `null` por e-mail globalmente — a ponte não habilita duas contas `null` do mesmo e-mail em tenants distintos.
- **Alternativa (rejeitada):** busca estrita `{ email, tenantId }` sem ponte. Quebraria a autenticação dos dados legados (dev sem re-seed e os `/scripts/qa-i*.mjs`, que criam usuários `null` em `interact_test`) até a MT-24.

### D3: `auth.js` valida pertencimento com 403

Após `req.user` definido, comparar `String(req.user.tenantId) === String(req.tenantId)`; se divergente, retornar **403 `"Usuário não pertence a este tenant"`**.

- **Por quê:** o middleware roda dentro do router (após `resolveTenantMiddleware` em `app.use("/api", ...)`), então `req.tenantId` já está resolvido. Garante o critério #3 (token do tenant A rejeitado no contexto B). Usa **403** para manter coesão com `requireAdmin` (autorização) — o critério aceita 401/403.
- **Caso `req.tenantId` nulo (QA sem tenant):** `String(null) === String(null)` → passa, preservando os scripts existentes.
- **Observação:** este check deve ser aplicado em TODAS as rotas autenticadas automaticamente (o middleware é global às rotas sob `/api` que usam `auth`), sem necessidade de tocar cada rota.

### D4: Sem mudança na ordem de middlewares em `app.js`

`app.use("/api", resolveTenantMiddleware, routes)` já garante `req.tenantId` antes de qualquer sub-router. A rota `/api/auth/login` é pública, então o login não passa por `auth` — o `req.tenantId` vem da resolução (header/subdomínio/fallback), que é exatamente o desejado.

## Risks / Trade-offs

- **Ponte `$or` de transição:** enquanto dados legados estão `null`, um usuário `null` pode autenticar em qualquer tenant resolvido. Mitigação: período curto (até a MT-24), apenas um `null` por e-mail (índice único), e o critério de aceite usa usuários com `tenantId` definido (que já ficam isolados). A MT-24 deve **remover a cláusula `{tenantId: null}`** do login (tarefa explicitamente anotada).
- **Inconsistência condicional do token em QA sem tenant:** com `req.tenantId` nulo, o JWT sai com `tenantId: null`. Aceitável: os scripts de integration não dependem de tenant e serão atualizados conforme as MTs seguintes.
- **Dados de teste isolados por tenant:** o QA (qa-i21) cria tenants A/B e usuários com `tenantId` explícitos; a ponte não interfere nesses cenários (usuários não são `null`).
