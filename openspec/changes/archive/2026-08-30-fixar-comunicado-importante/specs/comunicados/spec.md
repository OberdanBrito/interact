## ADDED Requirements

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