## Purpose

Permite ao colaborador encontrar um comunicado por título ou autor, digitando no campo de busca
do feed. A busca combina com a visibilidade por grupo, o seletor de ambiente, os filtros de
categoria e a aba Ativos/Arquivo, e cai para o cache offline (IndexedDB) quando sem conexão.

## Requirements

### Requirement: Campo de busca no feed do colaborador
O sistema SHALL exibir um campo de busca no feed do colaborador. Ao digitar um termo, o feed
SHALL filtrar os comunicados por título e autor, solicitando à API `GET /api/posts?search=<termo>`
(ex. regex em `title` e `author.name`).

#### Scenario: Buscar por título
- **WHEN** um colaborador digita um termo no campo de busca
- **THEN** o feed solicita à API os comunicados cujo título contém o termo e exibe somente os
  resultados

#### Scenario: Buscar por autor
- **WHEN** um colaborador digita o nome do autor de um comunicado no campo de busca
- **THEN** o feed solicita à API os comunicados cujo autor contém o termo e exibe somente os
  resultados

#### Scenario: Limpar a busca
- **WHEN** um colaborador apaga o termo do campo de busca
- **THEN** o feed volta a exibir todos os comunicados sem o filtro de busca

### Requirement: Busca preserva visibilidade e seletor de ambiente
O sistema SHALL combinar a busca com a visibilidade por grupo e o seletor de ambiente ativo,
enviando `?search=` junto com `?groupId=` quando um grupo específico está selecionado, de modo
que a busca nunca vaze comunicados fora dos grupos do colaborador.

#### Scenario: Buscar dentro de um ambiente específico
- **WHEN** um colaborador seleciona um ambiente (grupo) no seletor e digita um termo de busca
- **THEN** o feed só exibe comunicados do grupo selecionado cujo título/autor contém o termo

#### Scenario: Buscar sem grupo não vaza conteúdo
- **WHEN** um colaborador com grupos limitados digita um termo de busca sem selecionar ambiente
- **THEN** o feed só exibe comunicados visíveis a ele (broadcast + direcionados aos seus grupos)
  que correspondem ao termo

### Requirement: Busca combina com filtros de categoria e aba Ativos/Arquivo
O sistema SHALL combinar a busca com o filtro de categoria (`?category=`) e com a aba Ativos/
Arquivo (`?archive=`), de modo que os resultados respeitem os demais filtros ativos no feed.

#### Scenario: Buscar dentro de uma categoria
- **WHEN** um colaborador seleciona uma categoria e digita um termo de busca
- **THEN** o feed exibe somente comunicados da categoria selecionada cujo título/autor contém o
  termo

#### Scenario: Buscar dentro da aba Arquivo
- **WHEN** um colaborador está na aba "Arquivo" e digita um termo de busca
- **THEN** o feed exibe somente comunicados arquivados cujo título/autor contém o termo

### Requirement: Busca offline usa cache do IndexedDB
O sistema SHALL, quando sem conexão, aplicar a busca sobre os posts cacheados no IndexedDB
(filtro local por título/autor), respectando a mesma visibilidade por grupo e os mêmes filtros
de ambiente/categoria/aba que a busca online.

#### Scenario: Buscar offline a partir do cache
- **WHEN** um colaborador está offline e digita um termo de busca
- **THEN** o feed filtra localmente no cache do IndexedDB e exibe somente os comunicados
  visíveis cacheados cujo título/autor contém o termo

### Requirement: Estado vazio para busca sem resultados
O sistema SHALL exibir um estado vazio claro ("Nenhum comunicado encontrado para a busca")
quando a busca não retorna nenhum resultado, distinto do estado vazio padrão de categoria.

#### Scenario: Busca sem resultados
- **WHEN** um colaborador digita um termo de busca que não corresponde a nenhum comunicado
- **THEN** o feed exibe a mensagem de estado vazio de busca em vez da listagem
