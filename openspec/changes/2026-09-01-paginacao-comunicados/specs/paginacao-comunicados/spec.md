## Purpose

Paginação por cursor e ordenação inteligente no backend para `GET /api/posts`: o feed do
colaborador passa a receber os comunicados já ordenados por fixado/urgente/não-lido/recente e
paginados de forma estável (keyset), escalando com o volume sem offset.

## ADDED Requirements

### Requirement: Paginação por cursor em GET /api/posts
O sistema SHALL aceitar paginação por **cursor** (não por offset) em `GET /api/posts` por meio dos
parâmetros opcionais `?limit` (inteiro) e `?cursor` (string opaca). Quando `limit` (ou `cursor`) é
enviado, o sistema SHALL responder com um envelope `{ items, nextCursor, hasMore }`, onde `items`
é a página de comunicados, `nextCursor` é a opacidade encodada da próxima página (ou `null` quando
não há mais itens) e `hasMore` é `true` se existem mais comunicados após esta página. Sem `limit` nem
`cursor`, o sistema SHALL preservar o comportamento atual, devolvendo o array simples de comunicados
(elegíveis, ordenados), sem envelope.

- `limit` SHALL ter um default (tamanho de página) e um teto máximo; valor inválido (não inteiro,
  zero, negativo ou acima do teto) SHALL retornar `400`.
- `cursor` SHALL ser opaco e baseado na chave de ordenação (keyset), não em um índice de posição.
- `nextCursor` SHALL ser emitido de forma que a paginação não salte nem duplique itens quando novos
  comunicados são inseridos no topo durante a navegação.

#### Scenario: Primeira página com limit
- **WHEN** um colaborador chama `GET /api/posts?limit=20`
- **THEN** a resposta é `{ items: [...], nextCursor: <string|null>, hasMore: <boolean> }` com no
  máximo 20 itens em `items`

#### Scenario: Próxima página com cursor
- **WHEN** um colaborador chama `GET /api/posts?limit=20&cursor=<nextCursor anterior>`
- **THEN** a resposta contém os 20 comunicados seguintes na mesma ordenação, sem duplicar a página
  anterior

#### Scenario: Última página
- **WHEN** um colaborador chama `GET /api/posts?limit=20&cursor=...` para a última página disponível
- **THEN** `hasMore` é `false` e `nextCursor` é `null`

#### Scenario: Sem parâmetros preserva o array
- **WHEN** um cliente chama `GET /api/posts` sem `limit` nem `cursor`
- **THEN** a resposta é o array simples de comunicados (sem envelope), como no comportamento atual

#### Scenario: Limit inválido é rejeitado
- **WHEN** um cliente chama `GET /api/posts?limit=0` ou `limit=abc`
- **THEN** o sistema responde `400`

### Requirement: Ordenação inteligente no backend para o feed do colaborador
O sistema SHALL ordenar a listagem `GET /api/posts` **no backend** para o colaborador, na ordem
fixado → urgente → não-lido → data desc, de modo que o cliente não precise reordenar por
não-lido/urgente. Um comunicado é considerado **não lido** para o usuário autenticado quando não há
interação dele com `read: true` para aquele comunicado (conjunto `read` do usuário na coleção de
interações). Para **admin**, a ordenação SHALL permanecer fixado → data desc (à pasta de hoje, sem
critério de urgente/não-lido).

- A ordenação inteligente SHALL aplicar-se à visão "ativos" do feed (ausência de `?archive` ou
  `archive=active`).
- A visão "Arquivo" (`?archive=archived`) SHALL permanecer ordenada por data desc (sem a
  priorização de fixado/urgente/não-lido).
- Comunicados `pinned` vencem `urgent`; dentro do mesmo nível, não lidos antes de lidos; empate
  resolvido por data desc (e um desempate determinístico para estabilidade do cursor).

#### Scenario: Fixado vence urgente
- **WHEN** um colaborador possui um comunicado fixado não-urgente e um urgente não-fixado
- **THEN** o fixado aparece antes do urgente na listagem do feed ativo

#### Scenario: Urgente vence não-urgente entre não fixados
- **WHEN** um colaborador possui dois comunicados não fixados, um urgente e outro não
- **THEN** o urgente aparece antes do não-urgente

#### Scenario: Não lido vence lido
- **WHEN** um colaborador (com `read` contendo um comunicado lido) possui um não lido e um lido,
  ambos não fixados e não urgentes
- **THEN** o não lido aparece antes do lido

#### Scenario: Arquivo ordena por data desc
- **WHEN** um colaborador chama `GET /api/posts?archive=archived&limit=20`
- **THEN** a página é ordenada por data desc, sem priorização de fixado/urgente/não-lido

#### Scenario: Admin não usa ordenação inteligente
- **WHEN** um admin chama `GET /api/posts?limit=20`
- **THEN** a página é ordenada por fixado → data desc, sem critério de urgente/não-lido

### Requirement: Paginação composta com filtros existentes
O sistema SHALL combinar a paginação por cursor com os filtros já existentes em `GET /api/posts`:
`?search` (I-09), `?archive` (I-12), `?category` e `?groupId`. O `cursor` SHALL ser válido para o
mesmo recorte (filtros + visibilidade); alterar qualquer filtro SHALL reiniciar a paginação na
primeira página (`cursor` zerado). A visibilidade do colaborador (broadcast + grupos) e do admin
(`createdBy`) continua valendo em todas as páginas.

#### Scenario: Busca paginada
- **WHEN** um colaborador chama `GET /api/posts?search=aviso&limit=20`
- **THEN** a resposta é o envelope com a primeira página dos comunicados que correspondem à busca,
  na mesma ordenação do feed

#### Scenario: Arquivo paginado
- **WHEN** um colaborador chama `GET /api/posts?archive=archived&limit=20`
- **THEN** a resposta é o envelope com a primeira página do arquivo, por data desc

#### Scenario: Mudar filtro reinicia a paginação
- **WHEN** um colaborador navega para a página 2 (envia `cursor`) e depois altera o termo de busca
- **THEN** ele deve solicitar a primeira página (`cursor` zerado), pois o recorte mudou

#### Scenario: Visibilidade preservada entre páginas
- **WHEN** um colaborador de um grupo chamado com `?groupId=<seu-grupo>&limit=20` navega por `cursor`
- **THEN** cada página contém somente comunicados do broadcast ou do grupo selecionado, sem vazar
  comunicados de outros grupos

### Requirement: Paginação estável com inserção via SSE
O sistema SHALL garantir que a paginação por cursor permaneça estável quando comunicados novos
chegam no topo via canal SSE (I-07): a inserção de um comunicado mais recente/prioritário no topo
NÃO SHALL desalinhar a paginação já carregada (páginas seguintes continuam corretas, sem duplicar
nem pular itens), pois o cursor é baseado na chave de ordenação do último item da página anterior.

#### Scenario: Novo comunicado não desalinha a próxima página
- **WHEN** um colaborador carrega a página 1, recebe por SSE um `post:new` que entra no topo, e então
  solicita a página 2 com o `nextCursor` da página 1
- **THEN** a página 2 retorna exatamente os comunicados seguintes (sem o novo, que pertence à
  página 1, e sem duplicados/pulos)
