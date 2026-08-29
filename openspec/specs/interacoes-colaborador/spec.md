## Purpose

Ações de leitura do colaborador no PWA: confirmar leitura, marcar como não lido, e os efeitos no
feed (ordenação inteligente urgentes → não-lidos → recentes) e no badge de não-lidos (Badging
API), com sincronização do estado ao backend via fila offline.

## Requirements

### Requirement: Ação "Marcar como não lido" no comunicado lido
O sistema SHALL permitir ao colaborador reverter a leitura de um comunicado já lido por uma ação
"Marcar como não lido" visível quando o post está lido (no sheet de detalhe e no rodapé do card).

#### Scenario: Reverter leitura pelo sheet
- **WHEN** um colaborador abre o sheet de um comunicado lido e toca em "Marcar como não lido"
- **THEN** o comunicado deixa de constar como lido e a ação "Confirmar leitura" volta a aparecer
  (quando `readMode: ack`)

#### Scenario: Reverter leitura pelo card
- **WHEN** um colaborador toca em "Marcar como não lido" no rodapé de um card de comunicado lido
- **THEN** o comunicado deixa de constar como lido

### Requirement: Post revertido volta para não-lidos na ordenação
O feed SHALL reordenar após a reversão para que o comunicado revertido volte ao grupo de
não-lidos da ordenação inteligente (urgentes → não-lidos → recentes).

#### Scenario: Reversão reordena o feed
- **WHEN** um colaborador marca um comunicado lido como não lido
- **THEN** o comunicado passa a ser ordenado no grupo de não-lidos (acima dos recentes já lidos)

### Requirement: Sincronização da reversão com o backend
O sistema SHALL persistir a reversão no localStorage e sincronizar `{ read: false }` ao backend
via fila offline (`PUT /api/interactions/:postId`), inclusive em cenário offline.

#### Scenario: Sincronizar read false ao backend
- **WHEN** um colaborador marca um comunicado como não lido
- **THEN** o estado local remove o `postId` da lista `read` e o backend recebe `read: false`
  (imediato ou após reconexão pela fila offline)

### Requirement: Badge de não-lidos recontado após reversão
O sistema SHALL recalcular o badge de não-lidos (Badging API) após a reversão, considerando o
comunicado revertido como não lido.

#### Scenario: Badge incrementado ao reverter
- **WHEN** um colaborador marca um comunicado lido como não lido
- **THEN** `refreshBadge` é chamado e o contador de não-lidos passa a incluir o comunicado
  revertido (via `clearAppBadge`/`setAppBadge`)