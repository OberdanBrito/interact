## ADDED Requirements

### Requirement: Anexar arquivo a um comunicado
O sistema SHALL permitir ao admin anexar um arquivo (incluindo imagem) a um comunicado por meio
de `POST /api/posts/:id/attachments` (multipart/form-data via multer), armazenando o binário em
disco e salvando os metadados (nome original, tipo MIME, tamanho e URL) em `attachments` no
documento do comunicado. O anexo é **sempre opcional** e nunca bloqueia criar, salvar rascunho,
publicar ou agendar um comunicado.

- O endpoint SHALL exigir autenticação e papel de admin;
- os metadados SHALL ser devolvidos na resposta (201) e expostos no payload do comunicado;
- o comunicado-alvo SHALL existir (senão 404);
- um anexo em um rascunho é salvo sem publicar e permanece invisível ao colaborador (segue o
  estado do comunicado).

#### Scenario: Admin anexa um arquivo a um comunicado publicado
- **WHEN** um admin envia `POST /api/posts/:id/attachments` com um arquivo válido (multipart)
- **THEN** o sistema grava o binário, adiciona os metadados ao `attachments` do comunicado
- **AND** responde 201 com os metadados do anexo

#### Scenario: Admin anexa um arquivo a um rascunho
- **WHEN** um admin envia `POST /api/posts/:id/attachments` com um arquivo válido em um rascunho
  (`published: false`, `draft: true`)
- **THEN** o sistema grava o anexo no rascunho (salvo sem publicar), visível apenas ao admin

#### Scenario: Anexar a comunicado inexistente
- **WHEN** um admin envia `POST /api/posts/:id/attachments` para um `:id` que não existe
- **THEN** o sistema responde 404

#### Scenario: Colaborador não pode anexar
- **WHEN** um colaborador envia `POST /api/posts/:id/attachments`
- **THEN** o sistema responde 403 (não autenticado como admin)

### Requirement: Servir o binário de um anexo respeitando a visibilidade
O sistema SHALL servir o binário de um anexo por `GET /api/posts/:id/attachments/:attachmentId`,
respeitando a **mesma visibilidade do comunicado** a que pertence: se o comunicado não for
elegível ao usuário (mesmas regras de `GET /:id` — admin só o que publicou; colaborador só
broadcast + direcionados aos seus grupos, não expirados, publicados), o sistema SHALL responder
404 (não revela a existência do anexo). Comunicado sem anexo SHALL retornar metadados vazios
(`attachments: []`), nunca `null`.

#### Scenario: Servir anexo de comunicado elegível
- **WHEN** um colaborador elegível chama `GET /api/posts/:id/attachments/:attachmentId`
- **THEN** o sistema devolve o binário com o `Content-Type` do anexo

#### Scenario: Servir anexo de comunicado não elegível
- **WHEN** um colaborador chama `GET /api/posts/:id/attachments/:attachmentId` para um anexo de
  um comunicado não elegível (fora de seus grupos ou expirado)
- **THEN** o sistema responde 404

#### Scenario: Servir anexo inexistente
- **WHEN** um usuário chama `GET /api/posts/:id/attachments/:attachmentId` para um `attachmentId`
  inexistente
- **THEN** o sistema responde 404

### Requirement: Remover um anexo de um comunicado
O sistema SHALL permitir ao admin remover um anexo de um comunicado por
`DELETE /api/posts/:id/attachments/:attachmentId`, apagando o binário do disco e os metadados do
`attachments`. A remoção SHALL respeitar a imutabilidade do comunicado publicado para **alvo**
(que não é alterado), mas o próprio comunicado permanece com o estado em que estava (publicado,
agendado ou rascunho).

#### Scenario: Admin remove um anexo
- **WHEN** um admin envia `DELETE /api/posts/:id/attachments/:attachmentId`
- **THEN** o sistema remove o binário e os metadados do anexo
- **AND** responde 200/204

#### Scenario: Remover anexo inexistente
- **WHEN** um admin envia `DELETE /api/posts/:id/attachments/:attachmentId` para um
  `attachmentId` inexistente
- **THEN** o sistema responde 404

### Requirement: Validar limites de tamanho e tipo de anexo
O sistema SHALL definir e validar limites de anexo no backend (tamanho máximo e tipos permitidos),
recusando uploads acima do tamanho ou com tipo não permitido com uma mensagem de erro clara
(HTTP 400). Um comunicado sem anexo SHALL ser representado por `attachments: []` (nunca `null`) em
qualquer payload.

#### Scenario: Upload de arquivo acima do tamanho máximo
- **WHEN** um admin envia `POST /api/posts/:id/attachments` com um arquivo que excede o tamanho
  máximo configurado
- **THEN** o sistema responde 400 com mensagem clara de erro de tamanho

#### Scenario: Upload de arquivo com tipo não permitido
- **WHEN** um admin envia `POST /api/posts/:id/attachments` com um arquivo de tipo não permitido
- **THEN** o sistema responde 400 com mensagem clara de erro de tipo

#### Scenario: Comunicado sem anexo exposto como array vazio
- **WHEN** um cliente consulta `GET /api/posts/:id` de um comunicado sem anexos
- **THEN** o payload contém `attachments: []` (não `null`)
