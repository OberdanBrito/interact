## Purpose

API de interações do Interact: sincronização do estado de leitura e curtida do colaborador por
comunicado (`PUT /api/interactions/:postId`), restauração do estado em novo dispositivo
(`GET /api/interactions/me`) e métricas de leitura/curtida para o admin (`members`, `summary`,
agregado por comunicado).

## Requirements

### Requirement: Limpar readAt ao reverter leitura
O sistema SHALL limpar o campo `readAt` (setar `null`) quando um colaborador reverter a leitura
de um comunicado (`read: false`) sobre um documento de interação que estava com `read: true`.

#### Scenario: Reverter leitura de um comunicado lido
- **WHEN** um colaborador envia `PUT /api/interactions/:postId` com `read: false` e o documento
  de interação existia com `read: true` e `readAt` preenchido
- **THEN** o sistema atualiza o documento com `read: false` e `readAt: null`
- **AND** responde 200 com `{ postId, liked, read: false }`

#### Scenario: Reverter leitura sem documento prévio
- **WHEN** um colaborador envia `PUT /api/interactions/:postId` com `read: false` e não existe
  documento de interação para o par (postId, userId)
- **THEN** o sistema cria o documento com `read: false` e `readAt: null` (via upsert) e responde
  200

#### Scenario: readAt preenchido na confirmação de leitura
- **WHEN** um colaborador envia `PUT /api/interactions/:postId` com `read: true` sobre um
  documento que estava `read: false`
- **THEN** o sistema define `read: true` e preenche `readAt` com a data atual (comportamento
  existente preservado)

### Requirement: Métricas "quem leu" refletem a reversão
O endpoint `GET /api/interactions/members` SHALL reportar `read: false` e `readAt: null` para o
colaborador que reverteu a leitura de um comunicado.

#### Scenario: Colaborador revertido aparece como não leu
- **WHEN** um admin consulta `GET /api/interactions/members?postId=X` e um colaborador reverteu a
  leitura do comunicado X
- **THEN** a lista inclui o colaborador com `read: false` e `readAt: null`

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