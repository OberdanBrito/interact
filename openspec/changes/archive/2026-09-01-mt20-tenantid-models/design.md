## Context

O backend é multi-tenant na fundação (MT-19): existe o model `Tenant` e o middleware `resolveTenant` que seta `req.tenant`. Mas os models de dados ainda não têm `tenantId`, e a unicidade de `email`/`name` é **global** (field-level `unique: true`), o que impediria o mesmo e-mail/grupo em tenants distintos. Este change torna o schema tenant-ready, sem escopar as rotas (MT-22/23).

## Goals / Non-Goals

**Goals:**
- Adicionar `tenantId` (referência a `Tenant`) em `User`, `Group`, `Comunicado`, `Interaction`.
- Tornar `email` e `name` únicos **por tenant** (índices compostos).
- Prefixar por `tenantId` os índices de consulta de comunicados e interações.

**Non-Goals:**
- Escopar rotas/consultas por tenant (→ MT-22/23).
- Incluir `tenantId` no JWT / validar login por tenant (→ MT-21).
- Particionar `uploads/<tenantId>/` (→ MT-22, para não quebrar download de anexos existentes).
- Migrar dados existentes para o tenant padrão (→ MT-24).

## Decisions

### D-1: `tenantId` como ObjectId ref `Tenant` (default `null`)
Usar `{ type: mongoose.Schema.Types.ObjectId, ref: "Tenant", default: null, index: true }`. Alternativa (String) descartada: perde a referência de integridade ao `Tenant`. Com ObjectId, o Mongoose converte o `req.tenantId` (string) para ObjectId nas queries, então o scoping posterior (MT-22/23) funciona sem conversão manual.

### D-2: Unicidade por tenant em `email`/`name`
Remover `unique: true` field-level e declarar índices compostos: `User.index({ email: 1, tenantId: 1 }, { unique: true })` e `Group.index({ name: 1, tenantId: 1 }, { unique: true })`. Permite o mesmo valor em tenants distintos, mas não dentro do mesmo tenant.

### D-3: Índices de comunicados/interações prefixados por `tenantId`
- `Comunicado`: `{ tenantId, published, dateISO }` e `{ tenantId, createdBy, dateISO }`.
- `Interaction`: `{ tenantId, postId, userId }` (unique) e `{ tenantId, userId, read, postId }`.
O índice de leitura começa por `tenantId` para as queries isoladas por tenant; a unicidade passa a ser por tenant (mesmo `postId`/`userId` em tenants distintos é permitido).

### D-4: `tenantId` aceita `null` (não obrigatório) nesta etapa
Nada quebra: seed/testes continuam salvando `tenantId = null`. Associar os dados existentes ao tenant padrão é responsabilidade da **MT-24**. Alternativa (campo `required`) descartada — quebraria o seed e testes atuais.

### D-5: Reindexação para remover os índices únicos globais legados
O `unique: true` field-level cria um índice único global (`email_1`, `name_1`) no banco. Ao removê-lo do schema e criar os compostos, o banco existente ainda pode conter o índice antigo, que **impediria** o mesmo e-mail/name em tenants distintos. Mitigação: rodar `db:reset` (ou dropar/recriar índices, `syncIndexes`) ao validar este change; o código passa a refletir apenas os índices compostos.

## Risks / Trade-offs

- **[Índice único global legado]** → impede email/name repetidos entre tenants no banco existente. Mitigação: D-5 — `db:reset`/`syncIndexes` ao testar; o schema não declara mais o único global.
- **[Índices compostos novos em produção]** → custo de criação e possível warning de reindex. Mitigação: índices criados incrementalmente; sem mudanças de dados/env em runtime.
- **[`tenantId = null` temporário]** → até a MT-24 não há separação real (todos `null`). Mitigação: é intencional e limitado a este passo estrutural; a MT-24 associa ao tenant padrão.

## Migration Plan

Sem migração de dados. Para validar: `npm run db:reset` (recria o banco e os índices com o novo schema) e então `npm run test:integration`. Rollback: reverter os 4 models para o estado anterior (sem `tenantId` e com `unique` field-level) — nenhuma rota depende deste campo ainda.
