## Why

Para escopar as entidades por tenant (MT-22/23), os models precisam de um `tenantId`. Além disso, a unicidade de `email` (usuário) e `name` (grupo) deve passar a ser **por tenant** — o mesmo e-mail/nome pode existir em tenants distintos, mas nunca duplicado dentro do mesmo tenant. Este passo é estrutural: adiciona o campo e ajusta os índices sem alterar o comportamento das rotas atuais.

## What Changes

- **Adicionar `tenantId`** (ObjectId ref `Tenant`, default `null`, `index: true`) aos models `User`, `Group`, `Comunicado` e `Interaction`.
- **`User`**: remover `unique: true` field-level de `email`; adicionar índice composto único `{ email, tenantId }`.
- **`Group`**: remover `unique: true` field-level de `name`; adicionar índice composto único `{ name, tenantId }`.
- **`Comunicado`**: índices de consulta passam a ser prefixados por `tenantId`: `{ tenantId, published, dateISO }` e `{ tenantId, createdBy, dateISO }`.
- **`Interaction`**: índices passam a ser prefixados por `tenantId`: `{ tenantId, postId, userId }` (unique) e `{ tenantId, userId, read, postId }`.

Nada disso é **BREAKING**: `tenantId` tem default `null`, então seed/testes e o comportamento atual continuam válidos (todos os dados existentes ficam com `tenantId = null` até a migração da MT-24).

## Capabilities

### New Capabilities
- _(nenhuma)_

### Modified Capabilities
- `multi-tenant`: adiciona requisitos de `tenantId` nos models (User, Group, Comunicado, Interaction) e de unicidade por tenant (email/name) — deltas `ADDED Requirements` na spec existente.

## Impact

- **Arquivos alterados:** `src/models/User.js`, `src/models/Group.js`, `src/models/Comunicado.js`, `src/models/Interaction.js`.
- **Sem mudança de contrato de API** — nenhuma rota muda neste passo.
- **Uploads:** a partição `uploads/<tenantId>/` fica **fora de escopo** (tratada na MT-22, quando as rotas de posts/anexos forem escopadas), para não quebrar o download de anexos existentes.
- **Fora de escopo (passos seguintes):** escopar rotas por tenant (MT-22/23); `tenantId` no JWT + validar pertencimento no login (MT-21); migração de dados existentes para o tenant padrão (MT-24).
