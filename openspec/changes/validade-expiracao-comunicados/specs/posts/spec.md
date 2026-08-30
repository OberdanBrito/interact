## ADDED Requirements

### Requirement: Formulário tem campo de validade opcional
O sistema SHALL exibir no formulário de comunicado um campo opcional "Validade" (datetime-local).
Quando o comunicado não tem `expiresAt`, o campo SHALL aparecer vazio (nunca `"null"` nem data
epoch). Ao salvar: campo vazio → o payload não envia `expiresAt` (criação) ou envia `expiresAt: ""`
(edição, limpando a validade); campo preenchido → o payload envia `expiresAt` em ISO.

#### Scenario: Criar comunicado sem validade
- **WHEN** o admin abre o formulário de novo comunicado sem preencher o campo de validade e salva
- **THEN** o payload enviado não contém `expiresAt`

#### Scenario: Definir validade na criação
- **WHEN** o admin preenche o campo de validade com uma data/hora e salva
- **THEN** o payload envia `expiresAt` em ISO com a data/hora escolhida

#### Scenario: Edição sem validade mostra campo vazio
- **WHEN** o admin edita um comunicado com `expiresAt: null`
- **THEN** o campo de validade aparece vazio (não `"null"`)

#### Scenario: Limpar validade reativa
- **WHEN** o admin edita um comunicado expirado, apaga o valor do campo de validade e salva
- **THEN** o payload envia `expiresAt: ""` (o backend limpa a validade e o comunicado volta a ser ativo)

### Requirement: Listagem identifica comunicado expirado
O sistema SHALL exibir na listagem o selo "Expirado" ao lado do título de comunicados com
`expired: true` no payload, e exibir a data de validade na linha (junto à data de publicação).
Comunicados sem `expiresAt` não exibem selo nem data de validade.

#### Scenario: Linha de comunicado expirado
- **WHEN** a listagem renderiza um comunicado com `expired: true`
- **THEN** o selo "Expirado" aparece ao lado do título e a data de validade é exibida na linha

#### Scenario: Comunicado sem validade
- **WHEN** a listagem renderiza um comunicado com `expiresAt: null`
- **THEN** nenhum selo "Expirado" é exibido e nenhuma data de validade aparece na linha