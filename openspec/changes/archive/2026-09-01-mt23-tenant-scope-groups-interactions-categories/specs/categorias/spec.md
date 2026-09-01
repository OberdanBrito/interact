## Purpose

Coleção de categorias do Interact, agora escopada por tenant: cada instância possui o seu conjunto
de categorias (identificadas por slug, únicas por tenant), e `GET /api/categories` passa a listar
somente as categorias do tenant.

## ADDED Requirements

### Requirement: Categorias persistidas como coleção por tenant
O sistema SHALL armazenar categorias como documentos de uma coleção com `slug` e `label`,
escopados por `tenantId`, com slug único por tenant.

#### Scenario: Seed cria categorias default por tenant
- **WHEN** o seed é executado para um tenant
- **THEN** o sistema cria as categorias default ("geral", "rh", "ti", "beneficios") vinculadas
  àquele tenant
- **AND** cada tenant tem o seu próprio conjunto, sem misturar com os de outras instâncias

### Requirement: Listar categorias somente do tenant
O sistema SHALL retornar, em `GET /api/categories`, somente as categorias do tenant resolvido,
cada uma no formato `{ id, label }` onde `id` é o slug da categoria.

#### Scenario: Admin/colaborador lista as categorias do seu tenant
- **WHEN** um usuário autenticado do tenant A chama `GET /api/categories`
- **THEN** a resposta contém somente as categorias do tenant A (incluindo legados `null`), cada
  uma como `{ id: "<slug>", label: "<label>" }`
- **AND** categorias de outros tenants não aparecem

#### Scenario: Categoria referenciada por comunicado permanece compatível
- **WHEN** um comunicado tem `categoryId: "rh"`
- **THEN** a categoria "rh" do mesmo tenant é retornada em `GET /api/categories` com `id: "rh"`
- **AND** o `id` (slug) continua sendo o valor usado pelo comunicado, preservando o vínculo
