## ADDED Requirements

### Requirement: Anexar arquivo no formulário de comunicado
O formulário de comunicado do painel admin SHALL permitir ao admin anexar um arquivo (incluindo
imagem) a um comunicado. O campo de anexo SHALL ser **sempre opcional**: nunca bloquear criar,
salvar rascunho, publicar ou agendar.

- Ao **criar** um novo comunicado com um arquivo selecionado, o sistema SHALL enviar o arquivo
  ao backend após a criação do post (o backend exige `:id`);
- ao **editar**, SHALL enviar o arquivo diretamente a `POST /api/posts/:id/attachments`;
- um comunicado sem anexo SHALL exibir o campo vazio/"—" (nunca `null` literal).

#### Scenario: Anexar arquivo a um novo comunicado
- **WHEN** o admin seleciona um arquivo no formulário de novo comunicado e publica
- **THEN** o sistema cria o post e envia o arquivo ao backend (`POST /api/posts/:id/attachments`)
- **AND** o anexo aparece na lista de anexos do comunicado

#### Scenario: Anexar arquivo a um comunicado em edição
- **WHEN** o admin seleciona um arquivo no formulário de edição e salva
- **THEN** o sistema envia o arquivo a `POST /api/posts/:id/attachments`
- **AND** o anexo aparece na lista de anexos

#### Scenario: Comunicado sem anexo mostra vazio
- **WHEN** um comunicado não possui anexos
- **THEN** o sistema exibe a seção de anexos vazia/"—" (sem o literal `null`)

### Requirement: Listar e remover anexos no formulário
O sistema SHALL exibir a lista de anexos do comunicado no formulário (nome, tipo/tamanho) e
permitir ao admin remover um anexo (`DELETE /api/posts/:id/attachments/:attachmentId`). A remoção
de um anexo não altera o estado do comunicado (publicado, agendado ou rascunho permanece).

#### Scenario: Administrador vê anexos do comunicado
- **WHEN** o admin abre o formulário de edição de um comunicado com anexos
- **THEN** o sistema lista os anexos com nome e tipo/tamanho

#### Scenario: Administrador remove um anexo
- **WHEN** o admin clica em "Remover" em um anexo da lista
- **THEN** o sistema envia `DELETE /api/posts/:id/attachments/:attachmentId`
- **AND** o anexo some da lista

### Requirement: Validar limites de anexo no formulário
O formulário SHALL validar o arquivo selecionado contra os mesmos limites de tamanho e tipo
definidos no backend (que é a fonte de verdade), exibindo um erro claro ao usuário em caso de
arquivo muito grande ou de tipo não permitido, sem publicar o comunicado.

#### Scenario: Upload de arquivo acima do limite exibe erro
- **WHEN** o admin seleciona um arquivo acima do tamanho máximo
- **THEN** o sistema exibe uma mensagem de erro clara (sem publicar o comunicado)

#### Scenario: Upload de tipo não permitido exibe erro
- **WHEN** o admin seleciona um arquivo de tipo não permitido
- **THEN** o sistema exibe uma mensagem de erro clara (sem publicar o comunicado)
