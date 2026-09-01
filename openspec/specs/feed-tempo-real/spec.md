# feed-tempo-real Specification

## Purpose
Consumo do canal SSE (`GET /api/events`) no feed do colaborador: novos comunicados entram sem
reload, edições/expirados são refletidos, com reconexão automática e fallback para polling (60s) após
3 falhas de SSE, sem regressão no cache offline (Dexie) nem no badge de não-lidos. O módulo de
conexão é reutilizável para a I-14 assinar `interaction:changed` no admin sem reimplementar.

## Requirements

### Requirement: Assinar o canal e refletir novos comunicados sem reload
O sistema SHALL assinar o canal SSE via um módulo de conexão reutilizável e, ao receber `post:new`
de um comunicado **elegível ao colaborador** (visibilidade por grupo + seletor de ambiente ativo),
inserir o comunicado no feed atual **sem reload**, em ≤ 5s da publicação.

- A inserção SHALL respeitar a ordenação inteligente do feed (fixado → urgente → não-lido →
  recente, e fixado/urgente vencendo a recência), sem re-fetch de toda a lista.
- Um evento de um comunicado **não elegível** à visão atual (grupo não selecionado / fora dos grupos
  do colaborador, ou view Arquivo incompatível) SHALL ser ignorado sem quebrar o estado.

#### Scenario: Novo comunicado publicado aparece sem reload
- **WHEN** o colaborador está com o feed aberto no ambiente "Todas" e um novo comunicado é publicado
- **THEN** o comunicado aparece na lista em ≤ 5s, sem recarregar a página, na posição correta da
  ordenação

#### Scenario: Evento de comunicado fora do grupo é ignorado
- **WHEN** o canal entrega `post:new` de um comunicado direcionado a um grupo ao qual o colaborador
  não pertence (e ele não está vendo esse ambiente)
- **THEN** o feed ignora o evento e não insere o card

#### Scenario: Novo comunicado é inserido na ordem correta
- **WHEN** um `post:new` chega para um comunicado urgente (não-lido)
- **THEN** o feed o insere respeitando fixado → urgente → não-lido → recente, sem reordenação
  global incorreta

#### Scenario: View "Arquivo" não é afetada por post:new
- **WHEN** o colaborador está na aba "Arquivo" e o canal entrega `post:new` de um comunicado recém
  publicado
- **THEN** a view Arquivo não ganha esse card (o post ainda é "ativo")

### Requirement: Reconexão automática
O sistema SHALL reconectar automaticamente ao canal quando a conexão cai (rede instável ou app
voltando de background), **sem intervenção do usuário**, e retomar a recepção de eventos.

#### Scenario: Reconexão após queda de rede
- **WHEN** a conexão SSE cai e volta (rede instável/mobile)
- **THEN** o sistema reconecta automaticamente e volta a receber eventos sem recarregar

### Requirement: Fallback para polling após 3 falhas de SSE
O sistema SHALL degradar para o polling atual (60s) quando o SSE falhar **3 vezes seguidas**,
voltando a usar o canal assim que ele reconectar. Durante o fallback, o feed SHALL continuar se
atualizando pelo polling existente (comportamento atual), sem erro visível ao usuário.

#### Scenario: Degradar para polling após 3 falhas
- **WHEN** o SSE falha 3 vezes consecutivas
- **THEN** o sistema passa a re-buscar `getPosts()` a cada 60s (sem erro visível) e mantém o feed
  atualizado

#### Scenario: Retomar SSE após reconexão
- **WHEN** o canal volta a conectar após o fallback de polling
- **THEN** o sistema retoma o uso do SSE (push) e deixa de depender do polling

### Requirement: Refletir edições e expirações incrementalmente
O sistema SHALL aplicar `post:updated` (substituir o card do comunicado já inserido) e
`post:expired` (remover/marcar o comunicado como expirado) **sem reload** e **só** quando o
comunicado está presente na visão atual.

#### Scenario: Editar um comunicado atualiza o card sem reload
- **WHEN** um `post:updated` chega para um comunicado já visível no feed
- **THEN** o card é substituído pelos dados novos sem recarregar

#### Scenario: Comunicado expirado sai da lista
- **WHEN** um `post:expired` chega para um comunicado presente no feed
- **THEN** o comunicado deixa de aparecer (sem reload) e o documento não é deletado no backend

### Requirement: Sem regressão no cache offline e no badge de não-lidos
O sistema SHALL manter o cache offline (IndexedDB/Dexie) e o badge de não-lidos funcionando após a
assinatura: inserções/edições/expirações SHALL atualizar o cache para o recorte já buscado, e o
badge SHALL recalcular ao inserir um novo não-lido.

#### Scenario: Novo comunicado é persistido no cache offline
- **WHEN** um `post:new` é aplicado ao feed e o colaborador está online
- **THEN** o comunicado é adicionado ao cache Deutex (recorte ativo) para leitura offline

#### Scenario: Badge reflete novo não-lido
- **WHEN** um `post:new` de um comunicado não lido chega pelo canal
- **THEN** o badge de não-lidos é recalculado e incrementado sem reload

### Requirement: Módulo de conexão reutilizável
O sistema SHALL fornecer o módulo de conexão SSE **exportado** com uma interface reutilizável (ex.:
`connect()`, `on(event, cb)`, `disconnect()`), de modo que a I-14 possa **importá-lo e assinar**
eventos (ex.: `interaction:changed`) no admin **sem reimplementar** a conexão.

#### Scenario: Módulo é importável e assina evento arbitrário
- **WHEN** um consumidor externo importa o módulo e assina um evento nomeado qualquer
- **THEN** o módulo conecta ao canal e entrega callbacks por evento, sem copiar a implementação
  de conexão/reconexão/fallback
