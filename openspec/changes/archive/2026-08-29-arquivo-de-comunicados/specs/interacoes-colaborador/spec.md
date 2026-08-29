## ADDED Requirements

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