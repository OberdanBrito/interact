## Purpose

API de comunicados do Interact: criação, edição, publicação, agendamento e rascunho de
comunicados, com visibilidade por grupo, estado derivado (rascunho/agendado/publicado),
separação de comunicados ativos/arquivados por idade (`?archive`), fixação de comunicados
importantes no topo (`pinned`), validade/expiração automática (`expiresAt`) e anexos de
arquivos/imagens (`attachments`).

## Requirements

### Requirement: Criar rascunho de comunicado
O sistema SHALL permitir ao admin criar um comunicado como rascunho (`status: "draft"`), salvo
sem publicação e sem data de liberação, com validação relaxada (título, autor e corpo
opcionais).

#### Scenario: Criar rascunho somente com título
- **WHEN** um admin envia `POST /api/posts` com `status: "draft"` e apenas `title` preenchido
- **THEN** o sistema cria o comunicado com `published: false`, `draft: true` e `publishAt: null`
- **AND** retorna o comunicado com `status: "rascunho"` em 201

#### Scenario: Criar rascunho sem título
- **WHEN** um admin envia `POST /api/posts` com `status: "draft"` e `title` vazio
- **THEN** o sistema aceita a criação (sem exigir título) e cria um rascunho

#### Scenario: Rascunho é invisível ao colaborador
- **WHEN** um colaborador chama `GET /api/posts`
- **THEN** o rascunho não aparece na lista (filtro `published: true`)

### Requirement: Editar rascunho com validação relaxada
O sistema SHALL permitir editar um rascunho sem exigir todos os campos obrigatórios, e o
rascunho permanece não publicado após a edição.

#### Scenario: Editar rascunho incompleto
- **WHEN** um admin envia `PUT /api/posts/:id` em um rascunho com apenas o título alterado
- **THEN** o sistema aplica a alteração sem exigir autor ou corpo
- **AND** o comunicado continua com `status: "rascunho"` e `published: false`

#### Scenario: Editar alvo de um rascunho
- **WHEN** um admin envia `PUT /api/posts/:id` em um rascunho ainda não publicado alterando
  `targetGroups`
- **THEN** o sistema permite alterar o alvo (não gera 400 de imutabilidade)

### Requirement: Publicar rascunho
O sistema SHALL permitir transformar um rascunho em comunicado publicado (publicar agora) ou
agendado.

#### Scenario: Publicar rascunho imediatamente
- **WHEN** um admin envia `PUT /api/posts/:id` em um rascunho com `status: "published"` e todos
  os campos obrigatórios preenchidos
- **THEN** o sistema define `published: true`, `draft: false`, `publishAt: null`
- **AND** retorna `status: "publicado"`

#### Scenario: Agendar rascunho
- **WHEN** um admin envia `PUT /api/posts/:id` em um rascunho com `publishAt` futuro e sem
  `status: "draft"`
- **THEN** o sistema define `draft: false` e agenda a liberação para `publishAt`
- **AND** retorna `status: "agendado"`

#### Scenario: Publicar rascunho sem título é rejeitado
- **WHEN** um admin tenta publicar um rascunho (`status: "published"`) com título vazio
- **THEN** o sistema responde 400 exigindo o título

#### Scenario: Publicar rascunho sem corpo ou autor é rejeitado
- **WHEN** um admin tenta publicar um rascunho (`status: "published"`) sem conteúdo (`body`
  vazio) ou sem autor (nome vazio), mesmo com título preenchido
- **THEN** o sistema responde 400 exigindo os campos obrigatórios de publicação

### Requirement: Reportar status de rascunho na API
O helper de resposta `toPost` SHALL reportar `status: "rascunho"` para documentos em draft.

#### Scenario: Status derivado corretamente
- **WHEN** o sistema serializa um comunicado com `draft: true`
- **THEN** o campo `status` da resposta é `"rascunho"`

### Requirement: Filtrar comunicados por idade (ativos/arquivados)
O sistema SHALL permitir ao colaborador filtrar `GET /api/posts` pelo parâmetro opcional
`?archive`, separando comunicados ativos de antigos por idade. Um comunicado é considerado
"antigo" (arquivado) quando publicado há `ARCHIVE_AFTER_DAYS` dias ou mais (padrão 30), e
"ativo" quando publicado há menos de `ARCHIVE_AFTER_DAYS` dias.

- `archive=active` → somente comunicados ativos (`dateISO` há menos de `ARCHIVE_AFTER_DAYS` dias);
- `archive=archived` → somente comunicados arquivados (`dateISO` há `ARCHIVE_AFTER_DAYS` dias ou mais);
- ausência do parâmetro → comportamento atual preservado (retorna todos os elegíveis);
- o filtro SHALL se combinar com visibilidade por grupo (`?groupId`), categoria (`?category`) e
  busca (`?search`); o parâmetro SHALL ser ignorado para requisições de admin (que continuam
  vendo só o que publicaram, sem separação por idade).

#### Scenario: Listar apenas comunicados ativos
- **WHEN** um colaborador chama `GET /api/posts?archive=active`
- **THEN** a resposta contém somente comunicados com `dateISO` há menos de `ARCHIVE_AFTER_DAYS` dias

#### Scenario: Listar apenas comunicados arquivados
- **WHEN** um colaborador chama `GET /api/posts?archive=archived`
- **THEN** a resposta contém somente comunicados com `dateISO` há `ARCHIVE_AFTER_DAYS` dias ou mais

#### Scenario: Sem parâmetro preserva o comportamento atual
- **WHEN** um colaborador chama `GET /api/posts` sem `?archive`
- **THEN** a resposta contém todos os comunicados elegíveis (ativos e antigos), como antes

#### Scenario: Busca funciona dentro do arquivo
- **WHEN** um colaborador chama `GET /api/posts?archive=archived&search=aviso`
- **THEN** a resposta contém somente comunicados arquivados cujo título ou autor corresponda a
  "aviso"

#### Scenario: Visibilidade por grupo funciona dentro do arquivo
- **WHEN** um colaborador chama `GET /api/posts?archive=archived&groupId=<seu-grupo>`
- **THEN** a resposta respeita a visibilidade do grupo (broadcast + direcionados aos seus grupos)

#### Scenario: Admin ignora o filtro de arquivo
- **WHEN** um admin chama `GET /api/posts?archive=archived`
- **THEN** o admin continua recebendo somente o que publicou, sem separação por idade

### Requirement: Comunicado pode ser fixado (pinned)
O sistema SHALL persistir um flag `pinned: boolean` (default `false`) no comunicado e expô-lo
no payload de `GET/POST/PUT /api/posts` como `pinned`. O pin é opcional e não altera o
comportamento de campos vazios nem o selo de urgência.

#### Scenario: Comunicado publicado sem pin
- **WHEN** um comunicado é criado sem informar `pinned`
- **THEN** o payload retorna `pinned: false`

#### Scenario: Payload expõe o pin
- **WHEN** um comunicado tem `pinned: true` persistido
- **THEN** `GET /api/posts` e `GET /api/posts/:id` retornam `pinned: true` no payload

### Requirement: GET /api/posts ordena pinned primeiro
O sistema SHALL ordenar a listagem de `GET /api/posts` com comunicados `pinned: true` primeiro
e, entre os fixados, por `dateISO` desc; os não fixados seguem a ordenação atual (`dateISO`
desc). A regra vale para colaborador e admin.

#### Scenario: Fixado vence mesmo sem ser o mais recente
- **WHEN** há um comunicado fixado mais antigo e um não-fixado mais recente
- **THEN** o fixado aparece primeiro na listagem

#### Scenario: Múltiplos fixados por recência
- **WHEN** dois comunicados estão fixados, um publicado antes do outro
- **THEN** o fixado mais recente aparece antes do fixado mais antigo

### Requirement: Pin restrito a comunicados publicados
O sistema SHALL aceitar `pinned` (boolean) no `PUT /api/posts/:id` apenas para comunicados já
publicados; tentar fixar rascunho ou agendado SHALL retornar `400` com
"Apenas comunicados publicados podem ser fixados". O `POST /api/posts` não aceita `pinned`
(pin é ação pós-publicação).

#### Scenario: Fixar comunicado publicado
- **WHEN** um admin envia `PUT /api/posts/:id` com `{ "pinned": true }` para um comunicado `published`
- **THEN** o sistema persiste `pinned: true` e retorna o payload com `pinned: true`

#### Scenario: Fixar rascunho ou agendado é rejeitado
- **WHEN** um admin envia `PUT /api/posts/:id` com `{ "pinned": true }` para um comunicado
  com `status` `"rascunho"` ou `"agendado"`
- **THEN** o sistema retorna `400` com a mensagem "Apenas comunicados publicados podem ser fixados"
  e o campo `pinned` permanece `false`

### Requirement: Comunicado pode ter validade (expiresAt)
O sistema SHALL persistir um campo opcional `expiresAt` (Date, default `null`) no comunicado e
expô-lo no payload de `GET/POST/PUT /api/posts` como `expiresAt` (ISO string ou `null`) junto
com um indicador derivado `expired` (boolean). `expired` SHALL ser `true` quando `expiresAt`
existe e é anterior ao momento atual. O campo `status` não muda (rascunho/agendado/publicado
permanecem como hoje).

#### Scenario: Criar comunicado sem validade
- **WHEN** um comunicado é criado sem informar `expiresAt`
- **THEN** o payload retorna `expiresAt: null` e `expired: false`

#### Scenario: Criar comunicado com validade futura
- **WHEN** um comunicado é criado com `expiresAt` no futuro
- **THEN** o payload retorna `expiresAt` em ISO e `expired: false`

#### Scenario: Payload expõe expiração derivada
- **WHEN** um comunicado tem `expiresAt` anterior ao momento atual
- **THEN** `GET /api/posts` e `GET /api/posts/:id` retornam `expired: true` no payload

### Requirement: Colaborador não vê comunicados expirados
O sistema SHALL filtrar comunicados expirados (`expired: true`) da listagem e do detalhe do
colaborador: `GET /api/posts` não retorna expirados (em nenhuma visão — sem `?archive`,
`archive=active` ou `archive=archived`) e `GET /api/posts/:id` de um comunicado expirado não é
elegível (retorna `404`). Comunicado sem `expiresAt` nunca é expirado.

#### Scenario: Expirado some do feed
- **WHEN** um colaborador chama `GET /api/posts` e existe um comunicado elegível com `expiresAt` anterior a agora
- **THEN** o comunicado expirado não aparece na resposta

#### Scenario: Expirado não aparece no arquivo
- **WHEN** um colaborador chama `GET /api/posts?archive=archived` e existe um comunicado elegível expirado
- **THEN** o comunicado expirado não aparece na resposta (expiração vale também no arquivo)

#### Scenario: Detalhe de expirado não é elegível
- **WHEN** um colaborador chama `GET /api/posts/:id` de um comunicado expirado
- **THEN** o sistema responde `404` (não revela a existência)

#### Scenario: Comunicado sem validade continua visível
- **WHEN** um colaborador chama `GET /api/posts` e existe um comunicado elegível sem `expiresAt`
- **THEN** o comunicado aparece normalmente na resposta

### Requirement: Admin vê comunicados expirados com indicador
O sistema SHALL não filtrar comunicados expirados para o admin: `GET /api/posts` do admin
continua retornando somente o que ele publicou (filtro `createdBy`), incluindo expirados, com
`expired: true` no payload para identificação.

#### Scenario: Admin lista comunicado expirado
- **WHEN** um admin chama `GET /api/posts` e publicou um comunicado com `expiresAt` anterior a agora
- **THEN** o comunicado aparece na resposta com `expired: true`

#### Scenario: Admin não filtra expirados por arquivo
- **WHEN** um admin chama `GET /api/posts?archive=archived`
- **THEN** o admin continua recebendo somente o que publicou, com expirados incluídos (sem separação)

### Requirement: expiresAt nunca bloqueia outras ações
O sistema SHALL tratar `expiresAt` como campo estritamente opcional em `POST /api/posts` e
`PUT /api/posts/:id`: sua ausência nunca impede criar, salvar rascunho, publicar ou agendar.
Data de expiração inválida (formato não parseável) SHALL retornar `400`; data válida no passado
é aceita e resulta em `expired: true` imediatamente (expiração imediata). Enviar `expiresAt`
vazio/`null` limpa o campo (comunicado volta a não ter validade) sem alterar o estado de
publicação.

#### Scenario: Salvar rascunho sem validade
- **WHEN** um admin envia `POST /api/posts` com `status: "draft"` e sem `expiresAt`
- **THEN** o sistema cria o rascunho normalmente, sem exigir validade

#### Scenario: Publicar sem validade
- **WHEN** um admin publica um comunicado sem `expiresAt`
- **THEN** o sistema publica normalmente e o payload retorna `expiresAt: null`

#### Scenario: Data de validade inválida é rejeitada
- **WHEN** um admin envia `POST /api/posts` com `expiresAt` em formato não parseável
- **THEN** o sistema retorna `400` sem criar o comunicado

#### Scenario: Limpar validade mantém o estado
- **WHEN** um admin envia `PUT /api/posts/:id` com `expiresAt: ""` em um comunicado publicado e expirado
- **THEN** o sistema limpa `expiresAt` (retorna `null`), `expired` passa a `false` e o comunicado continua publicado

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

### Requirement: Comunicados são escopados por tenant

O sistema SHALL escopar todas as operações de `/api/posts` (listagem, detalhe, criação, edição,
exclusão e anexos) pelo tenant resolvido da requisição (`req.tenantId`), de modo que um
comunicado de uma instância não seja legível por outra. Durante a transição (até o backfill da
MT-24), comunicados legados com `tenantId` nulo permanecem visíveis/elegíveis para qualquer
contexto sem tenant próprio, preservando o comportamento atual de dev/QA. Comunicados com
`tenantId` definido de um tenant diferente **NUNCA** são expostos a outro tenant.

#### Scenario: Admin lista apenas comunicados do seu tenant

- **WHEN** um admin autenticado em um tenant chama `GET /api/posts`
- **THEN** a resposta contém apenas comunicados cujo `tenantId` corresponde ao tenant do admin
- **AND** nenhum comunicado de outro tenant aparece

#### Scenario: Colaborador lista apenas comunicados do seu tenant

- **WHEN** um colaborador autenticado em um tenant chama `GET /api/posts`
- **THEN** a resposta contém apenas comunicados elegíveis dentro do seu tenant (nunca de outro)

#### Scenario: Detalhe de comunicado de outro tenant não é exposto

- **WHEN** um usuário autenticado em um tenant chama `GET /api/posts/:id` de um comunicado cujo
  `tenantId` pertence a outro tenant
- **THEN** o sistema responde `404` (não `403`), sem revelar a existência do comunicado

#### Scenario: Criar comunicado registra o tenant

- **WHEN** um admin autenticado em um tenant cria um comunicado via `POST /api/posts`
- **THEN** o comunicado é persistido com `tenantId` igual ao tenant resolvido da requisição

#### Scenario: Editar comunicado de outro tenant não é exposto

- **WHEN** um admin autenticado em um tenant envia `PUT /api/posts/:id` para um comunicado de
  outro tenant
- **THEN** o sistema responde `404` e não aplica a alteração

#### Scenario: Excluir comunicado de outro tenant não é exposto

- **WHEN** um admin autenticado em um tenant envia `DELETE /api/posts/:id` para um comunicado de
  outro tenant
- **THEN** o sistema responde `404` e não exclui o comunicado

#### Scenario: Anexos de comunicado de outro tenant não são expostos

- **WHEN** um usuário autenticado em um tenant consulta `GET /api/posts/:id/attachments/:attachmentId`
  de um comunicado de outro tenant
- **THEN** o sistema responde `404` (mesma visibilidade do comunicado, que não é elegível)

### Requirement: isPostEligible considera o tenant do comunicado

O helper de elegibilidade SHALL considerar o `tenantId` do documento como pré-condição: um
comunicado só é elegível para um usuário se o `tenantId` do documento corresponder ao `tenantId`
do usuário (ou se ambos forem o caso de transição com `tenantId` nulo). Comunicados de outro
tenant nunca são elegíveis.

#### Scenario: Comunicado de outro tenant não é elegível

- **WHEN** um usuário autenticado acessa um comunicado cujo `tenantId` difere do seu
- **THEN** o comunicado não é elegível e o acesso retorna `404`

#### Scenario: Comunicado legado (tenantId nulo) permanece elegível na transição

- **WHEN** um usuário autenticado acessa um comunicado legado com `tenantId` nulo (anterior à
  migração da MT-24)
- **THEN** o comunicado permanece elegível, preservando o comportamento atual de dev/QA

#### Scenario: Comunicado do mesmo tenant é elegível

- **WHEN** um usuário autenticado acessa um comunicado cujo `tenantId` corresponde ao seu
- **THEN** o comunicado é elegível e as demais regras de visibilidade (grupo, expiração, estado)
  continuam valendo

### Requirement: IDs de comunicado são gerados como UUID

O sistema SHALL gerar o `_id` de um novo comunicado como um UUID (via `crypto.randomUUID()`),
em vez de uma sequência global (`p01/p02`), de modo que IDs não colidam entre tenants. Os IDs
históricos (ex.: `p01`) permanecem válidos; apenas a geração de novos comunicados muda para UUID.
O campo `id` exposto no payload continua sendo uma string.

#### Scenario: Criar comunicado gera id UUID

- **WHEN** um admin cria um comunicado via `POST /api/posts`
- **THEN** o comunicado é persistido com um `_id` em formato UUID (hash hexadeci­mal no padrão
  `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- **AND** o payload retorna esse `id` como string

#### Scenario: IDs não colidem entre tenants

- **WHEN** dois tenants diferentes criam comunicados independentes
- **THEN** os `id` gerados são distintos (UUID), sem reutilização de sequência compartilhada

#### Scenario: IDs históricos permanecem válidos

- **WHEN** um administrador consulta um comunicado criado antes da migração (id no formato `pNN`)
- **THEN** o comunicado continua acessível pelo seu `id` e o payload retorna `id: "pNN"`
