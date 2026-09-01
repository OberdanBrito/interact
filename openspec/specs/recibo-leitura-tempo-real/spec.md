# recibo-leitura-tempo-real Specification

## Purpose
Permite ao admin visualizar, no painel "Detalhes de leitura" do frontend_admin, a lista individual de
quem leu/curtiu um comunicado com atualização automática (intervalo ≤ 60s) sem recarregar a página,
preservando o filtro de grupo ativo e encerrando o ciclo ao sair da tela.

## Requirements

### Requirement: Atualização automática da lista de leituras

O sistema SHALL atualizar automaticamente a lista de quem leu/curtiu um comunicado no painel "Detalhes
de leitura", sem recarregar a página, a cada intervalo de até 60 (sessenta) segundos enquanto a tela
estiver aberta. A atualização SHALL refazer a consulta dos membros e re-renderizar a tabela e os
totais de leituras/curtidas exibidos no cabeçalho.

#### Scenario: Novo leitor aparece sem reload

- **WHEN** o admin está no painel "Detalhes de leitura" de um comunicado e um colaborador confirma a
  leitura (ou curte) nesse mesmo comunicado
- **THEN** dentro de no máximo 60 segundos a lista passa a exibir o novo leitor/curtida e os totais
  de leituras/curtidas são re-renderizados, sem nenhum reload manual da página

#### Scenario: Intervalo da atualização dentro do limite

- **WHEN** o painel "Detalhes de leitura" está aberto e uma atualização automática ocorre
- **THEN** o intervalo entre duas atualizações consecutivas é de no máximo 60 segundos

### Requirement: Preservar filtro de grupo durante a atualização

O sistema SHALL preservar o filtro de grupo selecionado pelo admin durante as atualizações
automáticas da lista — o refresh não deve resetar a opção de grupo ativa nem o conjunto de linhas
filtrado.

#### Scenario: Filtro de grupo permanece após o refresh

- **WHEN** o admin seleciona um filtro de grupo específico no painel "Detalhes de leitura"
- **THEN** após uma atualização automática, o mesmo filtro continua ativo e a tabela continua
  exibindo apenas os colaboradores do grupo selecionado

### Requirement: Encerrar o polling ao sair da rota

O sistema SHALL encerrar o ciclo de atualização automática (polling) quando o admin sair do painel
"Detalhes de leitura" ao navegar para outra rota, evitando novas requisições e renderizações após a
saída da tela.

#### Scenario: Sair do detalhe encerra o ciclo

- **WHEN** o admin navega do painel "Detalhes de leitura" para outra tela (ex.: listagem de métricas
  ou de comunicados)
- **THEN** o sistema interrompe o ciclo de atualização automática e não dispara novas requisições nem
  renderizações em componentes já desmontados
