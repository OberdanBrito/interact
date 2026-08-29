## ADDED Requirements

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