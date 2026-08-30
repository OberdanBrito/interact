## Purpose

Ações de leitura do colaborador no PWA: confirmar leitura, marcar como não lido, e os efeitos no
feed (ordenação inteligente urgentes → não-lidos → recentes) e no badge de não-lidos (Badging
API), com sincronização do estado ao backend via fila offline. Também cobre a separação do feed
em duas visões — "Ativos" (padrão) e "Arquivo" (comunicados antigos) — com interações preservadas
no arquivo, a fixação de comunicados importantes (indicador visual + pin vencendo a ordenação) e
a exibição de anexos (arquivos/imagens) no detalhe com link de download.

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

### Requirement: Feed mostra indicador visual de fixado
O sistema SHALL exibir o selo "Fixado" no card do comunicado quando `pinned === true`, em
qualquer visão ("Ativos" e "Arquivo"). O selo é independente do selo "Urgente".

#### Scenario: Card de comunicado fixado
- **WHEN** o feed renderiza um comunicado com `pinned: true`
- **THEN** o card exibe o selo "Fixado" junto aos demais selos (categoria/urgente/direcionado)

#### Scenario: Card de comunicado não fixado
- **WHEN** o feed renderiza um comunicado com `pinned: false`
- **THEN** o card não exibe o selo "Fixado"

### Requirement: Ordenação do feed coloca fixados primeiro
O sistema SHALL ordenar a visão "Ativos" com comunicados `pinned: true` primeiro — o pin vence
a urgência — e, entre os fixados, por `dateISO` desc; os não fixados seguem a ordenação
inteligente atual (urgente → não-lidos → recentes). A visão "Arquivo" (I-12) SHALL manter a
ordenação por data desc (`sortByDate`), sem que o pin mude a ordem.

#### Scenario: Fixado vence urgente
- **WHEN** há um comunicado fixado e um comunicado urgente não fixado no feed "Ativos"
- **THEN** o fixado aparece antes do urgente

#### Scenario: Múltiplos fixados por recência
- **WHEN** dois comunicados estão fixados, um publicado antes do outro
- **THEN** o fixado mais recente aparece primeiro, e ambos antes dos não fixados

#### Scenario: Arquivo mantém data desc
- **WHEN** a visão "Arquivo" renderiza comunicados com e sem pin
- **THEN** a ordenação permanece por `dateISO` desc (o pin não altera a posição no arquivo)

### Requirement: Exibir anexos do comunicado no detalhe
O feed do colaborador SHALL exibir os anexos (arquivos/imagens) de um comunicado no detalhe
(bottom sheet), cada um com link de download/visualização apontando para
`GET /api/posts/:id/attachments/:attachmentId`. O anexo SHALL respeitar a visibilidade do
comunicado a que pertence — só aparece para quem já visualiza o comunicado. Um comunicado sem
anexo SHALL exibir ausência limpa ("—"/vazio), nunca o literal `null`.

#### Scenario: Exibir anexos no detalhe
- **WHEN** o colaborador abre o bottom sheet de um comunicado com anexos
- **THEN** o sistema rendereiza a lista de anexos com nome e link de download/visualização

#### Scenario: Comunicado sem anexo não mostra null
- **WHEN** o colaborador abre o bottom sheet de um comunicado sem anexos (`attachments: []`)
- **THEN** o sistema não exibe o literal `null` nem uma seção vazia confusa (vazio/"—")

#### Scenario: Anexo respeita a visibilidade do comunicado
- **WHEN** um anexo pertence a um comunicado expirado ou fora dos grupos do colaborador
- **THEN** o anexo não aparece (mesma elegibilidade do comunicado)

### Requirement: Link de download do anexo
O sistema SHALL permitir ao colaborador baixar/visualizar um anexo pelo link exibido, que aponta
para o endpoint de servir binário do backend (`GET /api/posts/:id/attachments/:attachmentId`), com
autenticação JWT no request.

#### Scenario: Baixar anexo pelo link
- **WHEN** o colaborador toca no link de download de um anexo de um comunicado elegível
- **THEN** o navegador solicita `GET /api/posts/:id/attachments/:attachmentId` autenticado e
  recebe o binário

### Requirement: Anexos no cache offline não quebram a leitura
O cache offline de posts (Dexie) SHALL continuar funcionando com o novo campo `attachments`
(metadados); os binários dos anexos não são cacheados. A exibição de um comunicado com anexos em
modo offline SHALL ser no-op gracioso para o binário (o link de download pode não funcionar sem
rede), sem quebrar a leitura do texto nem causar erro.

#### Scenario: Ler comunicado com anexos offline
- **WHEN** o colaborador abre um comunicado com anexos em modo offline (a partir do cache)
- **THEN** o texto é exibido normalmente e a lista de anexos é renderizada a partir dos metadados
  cacheados, sem erro