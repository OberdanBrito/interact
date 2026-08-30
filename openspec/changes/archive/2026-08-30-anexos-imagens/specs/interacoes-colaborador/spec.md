## ADDED Requirements

### Requirement: Exibir anexos do comunicado no detalhe
O feed do colaborador SHALL exibir os anexos (arquivos/imagens) de um comunicado no detalhe
(bottom sheet), cada um com link de download/visualização apontando para
`GET /api/posts/:id/attachments/:attachmentId`. O anexo SHALL respeitar a visibilidade do
comunicado a que pertence — só aparece para quem já visualiza o comunicado. Um comunicado sem
anexo SHALL exibir ausência limpa ("—"/vazio), nunca o literal `null`.

#### Scenario: Exibir anexos no detalhe
- **WHEN** o colaborador abre o bottom sheet de um comunicado com anexos
- **THEN** o sistema rendereiza a lista de anexos com nome e link de download/visualização

#### Scenario: Comunicado sem anexo não mostra null
- **WHEN** o colaborador abre o bottom sheet de um comunicado sem anexos (`attachments: []`)
- **THEN** o sistema não exibe o literal `null` nem uma seção vazia confusa (vazio/"—")

#### Scenario: Anexo respeita a visibilidade do comunicado
- **WHEN** um anexo pertence a um comunicado expirado ou fora dos grupos do colaborador
- **THEN** o anexo não aparece (mesma elegibilidade do comunicado)

### Requirement: Link de download do anexo
O sistema SHALL permitir ao colaborador baixar/visualizar um anexo pelo link exibido, que aponta
para o endpoint de servir binário do backend (`GET /api/posts/:id/attachments/:attachmentId`), com
autenticação JWT no request.

#### Scenario: Baixar anexo pelo link
- **WHEN** o colaborador toca no link de download de um anexo de um comunicado elegível
- **THEN** o navegador solicita `GET /api/posts/:id/attachments/:attachmentId` autenticado e
  recebe o binário

### Requirement: Anexos no cache offline não quebram a leitura
O cache offline de posts (Dexie) SHALL continuar funcionando com o novo campo `attachments`
(metadados); os binários dos anexos não são cacheados. A exibição de um comunicado com anexos em
modo offline SHALL ser no-op gracioso para o binário (o link de download pode não funcionar sem
rede), sem quebrar a leitura do texto nem causar erro.

#### Scenario: Ler comunicado com anexos offline
- **WHEN** o colaborador abre um comunicado com anexos em modo offline (a partir do cache)
- **THEN** o texto é exibido normalmente e a lista de anexos é renderizada a partir dos metadados
  cacheados, sem erro
