# infinite-scroll-feed Specification

## Purpose

Infinite scroll no feed do colaborador consumindo a paginação por cursor de `GET /api/posts`, sem
reordenar localmente por não-lido/urgente (ordenação pronta do backend), compondo com busca,
categoria, ambiente e arquivo, e sem desalinhar o cursor com posts novos via SSE (I-07).

## Requirements

### Requirement: Consumir paginação por cursor no feed
O sistema SHALL buscar o feed do colaborador via `GET /api/posts` enviando `limit` (tamanho de
página) e, para páginas seguintes, `cursor`, e renderizar os `items` do envelope de resposta
`{ items, nextCursor, hasMore }`. O feed não deve mais assumir que a resposta é um array simples.

#### Scenario: Primeira página renderizada
- **WHEN** o colaborador abre o feed ativo
- **THEN** o sistema chama `GET /api/posts?limit=<N>` e renderiza os `items` da primeira página

#### Scenario: Página seguinte ao rolar
- **WHEN** o colaborador rola até o fim e existe `nextCursor`
- **THEN** o sistema busca `GET /api/posts?limit=<N>&cursor=<nextCursor>` e acrescenta os novos
  `items` à lista, sem re-renderizar os itens já carregados

### Requirement: Infinite scroll sem duplicar nem pular
O sistema SHALL implementar infinite scroll (sentinel no fim da lista, via IntersectionObserver ou
equivalente) que carrega a próxima página apenas quando `hasMore` é `true`, evitando duplicar
itens entre páginas e sem "pulos" de itens não-lidos. Quando `hasMore` é `false`, o sistema SHALL
parar de buscar (estado de fim de lista), exibindo um indicador de carregando/fim.

#### Scenario: Não duplica ao carregar mais
- **WHEN** o colaborador aciona o infinite scroll duas vezes com o mesmo fim de lista
- **THEN** os itens são acrescentados uma única vez, sem duplicados entre páginas

#### Scenario: Fim da lista
- **WHEN** `hasMore` é `false` após a última página
- **THEN** o sistema não dispara novas buscas e exibe o estado de fim de lista

#### Scenario: Sem pulos de não lidos
- **WHEN** o colaborador rola entre a página 1 e a página 2
- **THEN** nenhum item não lido (que deveria vir antes) é pulado entre as páginas, pois a ordem
  vem pronta do backend

### Requirement: Remover reordenação local por não-lido/urgente
O sistema SHALL deixar de ordenar localmente o feed por fixado/urgente/não-lido/recente
(`sortFeed` para o feed ativo), confiando na ordenação já produzida pelo backend; o feed ativo SHALL
usar a ordem recebida do servidor. A visão "Arquivo" SHALL continuar ordenada por data desc (ordem
de servidor do arquivo). A reordenação local duplicada (pinned/urgent/unread) SHALL ser removida do
`feed.js`.

#### Scenario: Feed usa a ordem do servidor
- **WHEN** o feed ativo é renderizado
- **THEN** os cards aparecem na ordem recebida do backend (fixado → urgente → não lido → recente),
  sem reordenar por não-lido localmente

#### Scenario: Arquivo ordena por data desc
- **WHEN** a aba "Arquivo" é exibida
- **THEN** os cards aparecem por data desc, conforme o servidor

### Requirement: Composição com busca, categoria, ambiente e arquivo
O sistema SHALL combinar a paginação com os recortes atuais `?search` (I-09), categoria, seletor de
ambiente (`?groupId`), e aba Ativos/Arquivo (`?archive`), enviando os parâmetros do recorte junto
de `limit`/`cursor`. Alteração de qualquer recorte SHALL reiniciar a paginação na primeira página
(`cursor` zerado). A filtragem por **categoria** (hoje client-side via chips) SHALL passar a ser
enviada ao backend (`?category`), para não filtrar apenas dentro de uma página.

#### Scenario: Busca reinicia a paginação
- **WHEN** o colaborador muda o termo de busca
- **THEN** o feed busca a primeira página do novo recorte (`cursor` zerado) e reinicia a lista

#### Scenario: Categoria é enviada ao backend
- **WHEN** o colaborador seleciona uma categoria (chip)
- **THEN** o sistema envia `?category=` junto de `limit` e renderiza a primeira página do recorte

#### Scenario: Mudar ambiente reinicia a lista
- **WHEN** o colaborador troca o seletor de ambiente
- **THEN** o feed busca a primeira página daquele ambiente (`cursor` zerado)

### Requirement: Inserções via SSE não desalinham o cursor
O sistema SHALL aplicar eventos SSE (I-07) sem desalinhar o cursor de paginação: `post:new` de um
comunicado elegível à visão atual SHALL ser inserido no topo da lista se pertencer ao início (e ao
recorte atual); eventos de comunicados já carregados (`post:updated`/`post:expired`) SHALL mutar o
item correspondente. Nenhuma inserção SHALL produzir duplicados nem desalinhar as páginas já
carregadas.

#### Scenario: Novo comunicado entra no topo sem duplicar
- **WHEN** o canal entrega `post:new` de um comunicado mais recente e elegível
- **THEN** o card é inserido no topo (se cabível ao recorte), sem duplicar itens das páginas
  carregadas

#### Scenario: Evento de comunicado já carregado atualiza o card
- **WHEN** o canal entrega `post:updated`/`post:expired` de um comunicado presente na lista
- **THEN** o card correspondente é atualizado/removido sem duplicar

### Requirement: Cache offline do recorte paginado
O sistema SHALL manter o cache offline (IndexedDB/Dexie) armazenando os itens das páginas já
carregadas do recorte atual, e o fallback offline SHALL filtrar esse acúmulo por grupo/arquivo/busca
(como hoje), sem duplicar ao re-buscar e sem regressão no badge de não-lidos.

#### Scenario: Itens paginados persistem no cache
- **WHEN** o colaborador carrega páginas do feed
- **THEN** os itens acumulados são persistidos no cache Dexie para leitura offline

#### Scenario: Fallback offline filtra o acúmulo
- **WHEN** a rede cai e o colaborador navega offline
- **THEN** o feed usa o cache acumulado, filtrando por grupo/arquivo/busca, sem duplicados

#### Scenario: Badge de não lidos segue correto
- **WHEN** itens não lidos entram pelo feed ou por SSE
- **THEN** o badge de não lidos é recalculado sem regressão
