## ADDED Requirements

### Requirement: Métricas de leitura/curtida com filtros opcionais no summary

O endpoint `GET /api/interactions/summary` SHALL aceitar filtros opcionais de período
(`desde`/`ate`, datas ISO) e de grupo (`groupId`) e SHALL manter o formato de resposta
`{ [postId]: { reads, likes } }` como base. A agregação SHALL considerar apenas as interações
cuja data de interação (`readAt` ou `likedAt`) se enquadre nos limites informados e cujo
colaborador pertença ao grupo informado. Na ausência de qualquer filtro, o comportamento atual
(todas as interações, sem recorte) SHALL ser preservado.

#### Scenario: Filtrar summary por período

- **WHEN** um admin consulta `GET /api/interactions/summary?desde=2026-08-01T00:00:00.000Z&ate=2026-08-31T23:59:59.999Z`
- **THEN** o sistema retorna `{ [postId]: { reads, likes } }` contando somente as interações cuja
  data de interação (`readAt` ou `likedAt`) está dentro do intervalo
- **AND** interações fora do intervalo não são contabilizadas

#### Scenario: Filtrar summary por grupo

- **WHEN** um admin consulta `GET /api/interactions/summary?groupId=<groupId>`
- **THEN** o sistema retorna `{ [postId]: { reads, likes } }` contando somente as interações de
  colaboradores que pertencem ao grupo informado
- **AND** interações de colaboradores de outros grupos não são contabilizadas

#### Scenario: Summary sem filtros preserva o comportamento atual

- **WHEN** um admin consulta `GET /api/interactions/summary` sem nenhum parâmetro de filtro
- **THEN** o sistema retorna o mesmo formato `{ [postId]: { reads, likes } }` agregando todas as
  interações existentes, sem qualquer recorte de período ou grupo

#### Scenario: Datas de filtro inválidas

- **WHEN** um admin consulta `GET /api/interactions/summary` com `desde` ou `ate` em formato
  inválido (não reconhecível como data ISO)
- **THEN** o sistema responde `400` com uma mensagem de erro indicando formato de data inválido
