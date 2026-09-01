## Purpose

Paginação simples na listagem de comunicados do painel admin: a lista já carregada de
`GET /api/posts` passa a ser exibida em páginas (client-side), com controles de navegação e
preservação dos filtros de categoria e busca.

## Requirements

### Requirement: Paginar a listagem em páginas
O sistema SHALL exibir a listagem de comunicados do admin em páginas (client-side), cortando o
conjunto já carregado/ordenado por um tamanho de página fixo (`pageSize`) e mostrando os itens da
página atual (`page`). A paginação opera sobre o conjunto **filtrado** (`filterPosts`), e não sobre
o conjunto bruto.

#### Scenario: Lista maior que a página
- **WHEN** a listagem filtrada possui mais comunicados que o `pageSize`
- **THEN** o sistema exibe somente os itens da primeira página e habilita controles de paginação

#### Scenario: Navegar para a próxima página
- **WHEN** o admin clica em "Próxima"
- **THEN** a tabela exibe os itens da próxima página e o indicador "Página X de Y" é atualizado

#### Scenario: Navegar para a página anterior
- **WHEN** o admin clica em "Anterior" estando em uma página > 1
- **THEN** a tabela exibe os itens da página anterior

### Requirement: Manter filtros funcionando com a paginação
O sistema SHALL continuar aplicando os filtros existentes (busca por título e categoria) sobre a
listagem e, ao alterar qualquer filtro, reiniciar a paginação na primeira página (`page = 1`). A
contagem de comunicados/rascunhos exibida SHALL refletir o total (antes do corte de página),
independente da página atual.

#### Scenario: Busca reseta para a primeira página
- **WHEN** o admin digita no campo de busca estando em uma página > 1 e muda o termo
- **THEN** a listagem reinicia na primeira página com o filtro aplicado

#### Scenario: Categoria reseta para a primeira página
- **WHEN** o admin muda o filtro de categoria estando em uma página > 1
- **THEN** a listagem reinicia na primeira página com o filtro aplicado

#### Scenario: Contador independe da página
- **WHEN** o admin está em qualquer página
- **THEN** o contador mostra o total de comunicados e de rascunhos do conjunto filtrado, sem ser
  afetado pelo corte de página

### Requirement: Renderizar controles de paginação somente quando necessário
O sistema SHALL renderizar os controles de paginação (Anterior/Próxima + indicador de página) apenas
quando o conjunto filtrado excede o `pageSize`, ocultando-os quando não há itens ou quando todos
cabem em uma página.

#### Scenario: Tudo cabe em uma página
- **WHEN** a listagem filtrada tem itens ≤ `pageSize`
- **THEN** o sistema não exibe controles de paginação

#### Scenario: Lista vazia
- **WHEN** a listagem filtrada está vazia (sem comunicados ou filtro zerou)
- **THEN** o sistema mantém o estado vazio existente e não exibe controles de paginação
