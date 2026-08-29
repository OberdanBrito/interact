## Purpose

Ações de leitura do colaborador no PWA: confirmar leitura, marcar como não lido, e os efeitos no
feed (ordenação inteligente urgentes → não-lidos → recentes) e no badge de não-lidos (Badging
API), com sincronização do estado ao backend via fila offline. Também cobre a separação do feed
em duas visões — "Ativos" (padrão) e "Arquivo" (comunicados antigos) — com interações preservadas
no arquivo.

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

### Requirement: Aba "Ativos | Arquivo" no feed
O sistema SHALL permitir ao colaborador alternar entre duas visões do feed por uma aba/toggle
"Ativos | Arquivo". A visão "Ativos" é a padrão e SHALL solicitar à API somente comunicados
ativos (publicados há menos de `ARCHIVE_AFTER_DAYS` dias, padrão 30) com a ordenação inteligente
preservada (urgentes → não-lidos → recentes). A visão "Arquivo" SHALL solicitar somente
comunicados arquivados (publicados há `ARCHIVE_AFTER_DAYS` dias ou mais), ordenados por data
(mais recente primeiro). Um comunicado é considerado "antigo" quando publicado há
`ARCHIVE_AFTER_DAYS` dias ou mais — critério idêntico ao do backend.

#### Scenario: Feed ativo não mostra comunicados antigos
- **WHEN** um colaborador abre o feed na visão "Ativos"
- **THEN** a lista não contém comunicados publicados há `ARCHIVE_AFTER_DAYS` dias ou mais

#### Scenario: Abrir a aba Arquivo
- **WHEN** um colaborador toca na aba "Arquivo"
- **THEN** o feed lista somente comunicados publicados há `ARCHIVE_AFTER_DAYS` dias ou mais,
  ordenados por data (mais recente primeiro)

#### Scenario: Ordenação inteligente preservada no feed ativo
- **WHEN** um colaborador visualiza a visão "Ativos" com comunicados urgentes, não-lidos e
  recentes
- **THEN** a ordenação é urgentes → não-lidos → recentes, restrita aos comunicados ativos

#### Scenario: Busca e visibilidade valem dentro do arquivo
- **WHEN** um colaborador está na visão "Arquivo" e aplica filtro de categoria, ambiente (grupo)
  ou busca
- **THEN** a listagem do arquivo respeita os mesmos filtros de visibilidade/busca do feed ativo

#### Scenario: Voltar para o feed ativo
- **WHEN** um colaborador toca na aba "Ativos" estando na visão "Arquivo"
- **THEN** o feed volta a mostrar somente comunicados ativos com a ordenação inteligente

### Requirement: Interações funcionam dentro do arquivo
O sistema SHALL manter as interações de leitura (confirmar leitura, marcar como não lido) e
curtida funcionando nos comunicados listados na visão "Arquivo", sem alterar sua mecânica.

#### Scenario: Marcar como não lido um comunicado arquivado
- **WHEN** um colaborador marca como não lido um comunicado na visão "Arquivo"
- **THEN** o estado de leitura é revertido localmente e sincronizado ao backend, e o comunicado
  permanece na visão "Arquivo" (não reordena para o feed ativo)

#### Scenario: Abrir detalhe de um comunicado arquivado
- **WHEN** um colaborador toca em um comunicado na visão "Arquivo"
- **THEN** o sheet de detalhe abre normalmente com as ações de leitura/curtida disponíveis