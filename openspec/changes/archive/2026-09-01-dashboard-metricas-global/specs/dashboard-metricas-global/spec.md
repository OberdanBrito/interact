## Purpose

Tela de dashboard global de métricas no painel administrativo, consolidando indicadores de
leitura/curtida de todos os comunicados (total, % lido, % curtido e desdobramento por grupo),
com ranking de comunicados e filtros de período e grupo.

## ADDED Requirements

### Requirement: Dashboard com indicadores consolidados

O sistema SHALL exibir, na tela de dashboard global, cards com os indicadores consolidados de
todos os comunicados visíveis ao admin: total de comunicados, percentual de leitura e percentual
de curtida (global e, quando aplicável, por grupo). Os indicadores SHALL ser calculados com base
nas interações sincronizadas ao backend.

#### Scenario: Dashboard renderiza indicadores globais

- **WHEN** um admin autenticado abre a tela de dashboard global
- **THEN** a tela exibe o total de comunicados, o percentual de leitura e o percentual de curtida
  considerando todos os comunicados

#### Scenario: Indicadores refletem o recorte de grupo

- **WHEN** o admin seleciona um grupo no filtro do dashboard
- **THEN** os indicadores são recalculados considerando apenas as interações dos colaboradores do
  grupo selecionado

### Requirement: Ranking de comunicados mais/menos lidos

O sistema SHALL exibir um ranking dos comunicados ordenado por número de leituras (mais lidos)
e, se houver, uma listagem dos menos lidos, conforme o recorte de período/grupo ativo.

#### Scenario: Comunicados aparecem ordenados por leituras

- **WHEN** um admin abre a tela de dashboard com um recorte de período/grupo
- **THEN** o ranking exibe os comunicados ordenados do maior para o menor número de leituras no
  recorte

### Requirement: Filtro por período e por grupo

O sistema SHALL permitir ao admin filtrar o dashboard por período (`desde`/`ate`) e por grupo,
recalculando os indicadores e o ranking de acordo com o recorte selecionado.

#### Scenario: Aplicar filtro de período

- **WHEN** o admin informa um intervalo de datas (`desde`/`ate`) no dashboard
- **THEN** os indicadores e o ranking passam a considerar apenas as interações dentro do período
  informado

#### Scenario: Aplicar filtro de grupo

- **WHEN** o admin seleciona um grupo no filtro do dashboard
- **THEN** os indicadores e o ranking passam a considerar apenas as interações dos colaboradores
  do grupo selecionado

### Requirement: Comunicado sem interações renderiza 0

O sistema SHALL exibir `0` leituras/curtidas (e não `null`) para comunicados que não possuem
interações no recorte ativo.

#### Scenario: Comunicado sem interações no recorte

- **WHEN** um comunicado não possui nenhuma interação dentro do período/grupo selecionados
- **THEN** a tela exibe o valor `0` para as leituras e/ou curtidas daquele comunicado
