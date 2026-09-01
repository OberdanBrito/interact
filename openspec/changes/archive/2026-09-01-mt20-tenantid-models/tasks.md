## 1. Modelo User

- [x] 1.1 Adicionar `tenantId` (`{ type: Schema.Types.ObjectId, ref: "Tenant", default: null, index: true }`) ao `userSchema` — verificar `node --check src/models/User.js`
- [x] 1.2 Remover `unique: true` field-level de `email` e adicionar índice composto único `{ email: 1, tenantId: 1 }` — verificar que o schema não declara mais `unique` no campo e `node --check` passa

## 2. Modelo Group

- [x] 2.1 Adicionar `tenantId` (ref `Tenant`, default `null`, index) ao `groupSchema` — verificar `node --check src/models/Group.js`
- [x] 2.2 Remover `unique: true` field-level de `name` e adicionar índice composto único `{ name: 1, tenantId: 1 }` — verificar que o schema não declara mais `unique` no campo e `node --check` passa

## 3. Modelo Comunicado

- [x] 3.1 Adicionar `tenantId` (ref `Tenant`, default `null`, index) ao `comunicadoSchema` — verificar `node --check src/models/Comunicado.js`
- [x] 3.2 Substituir os índices existentes por compostos prefixados por `tenantId`: `{ tenantId: 1, published: 1, dateISO: -1 }` e `{ tenantId: 1, createdBy: 1, dateISO: -1 }` — verificar `node --check` e que os índices antigos não são mais declarados

## 4. Modelo Interaction

- [x] 4.1 Adicionar `tenantId` (ref `Tenant`, default `null`, index) ao `interactionSchema` — verificar `node --check src/models/Interaction.js`
- [x] 4.2 Substituir os índices por compostos prefixados por `tenantId`: `{ tenantId: 1, postId: 1, userId: 1 }` (unique) e `{ tenantId: 1, userId: 1, read: 1, postId: 1 }` — verificar `node --check`

## 5. Validação integrada

- [x] 5.1 Rodar `node --check` nos 4 models (`User.js`, `Group.js`, `Comunicado.js`, `Interaction.js`) — verificar que todos passam
- [x] 5.2 Rodar `npm run db:reset` (recria banco + índices com o novo schema) e listar os índices de `users`/`groups` no Mongo — verificar que não existem mais `email_1`/`name_1` globais e que existem os compostos `{ email, tenantId }`/`{ name, tenantId }`
- [x] 5.3 Rodar `npm run test:integration` com Mongo real — verificar que não há regressão nas rotas atuais
- [x] 5.4 Testar a unicidade por tenant (via script temporário/Mongo): criar 2 tenants e criar o mesmo `email`/`name` em cada (permitido) e o mesmo `email`/`name` no mesmo tenant (viola o índice único) — verificar os dois comportamentos
