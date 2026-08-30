## ADDED Requirements

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