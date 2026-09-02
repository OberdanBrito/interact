## MODIFIED Requirements

### Requirement: Emitir eventos de ciclo de vida de comunicado

O sistema SHALL emitir eventos no canal quando um comunicado muda de estado relevante ao feed do
colaborador:

- `post:new` quando um comunicado **fica visível** ao colaborador — criação/publicação imediata ou
  liberação de um agendado (I-01).
- `post:updated` quando um comunicado já visível é editado (conteúdo, autor, categoria ou
  grupo-alvo).
- `post:expired` quando o sistema detecta que um comunicado expirou (I-05) — expiração derivada,
  **sem delete**.
- O payload SHALL incluir ao menos o identificador e os campos necessários para reconciliar a lista
  do cliente (ex.: `id` e `dateISO`/`updatedAt`), **e o `tenantId`** (o escopo do tenant ao qual o
  comunicado pertence).

#### Scenario: Publicar novo comunicado emite post:new

- **WHEN** um admin cria e publica um comunicado via `POST /api/posts` (publicação imediata)
- **THEN** o servidor emite `post:new` com o payload do comunicado visível incluindo `tenantId`

#### Scenario: Liberar agendado emite post:new

- **WHEN** o scheduler (I-01) libera um comunicado agendado (`release`)
- **THEN** o servidor emite `post:new` para o comunicado recém-liberado com `tenantId`

#### Scenario: Editar comunicado visível emite post:updated

- **WHEN** um admin edita um comunicado já publicado via `PUT /api/posts/:id`
- **THEN** o servidor emite `post:updated` com `tenantId`

#### Scenario: Comunicado expirado emite post:expired

- **WHEN** o sistema detecta que um comunicado com `expiresAt` atingiu a validade (expiração
  derivada)
- **THEN** o servidor emite `post:expired` com `tenantId` (sem deletar o documento)

#### Scenario: Rascunho/agendado não emite evento de feed

- **WHEN** um admin salva um rascunho ou cria um agendado que ainda não foi liberado
- **THEN** o servidor NÃO emite `post:new` (o comunicado permanece invisível ao colaborador)

## ADDED Requirements

### Requirement: Cliente SSE recebe apenas eventos do seu tenant

O canal `GET /api/events` DEVE (SHALL) resolver o tenant de cada conexão (via token/subdomínio) e
repassar apenas os eventos cujo `payload.tenantId` casa com o tenant da conexão. Eventos de outro
tenant DEVERÃO (SHALL) ser descartados para aquele cliente, sem encerrar a conexão.

#### Scenario: Cliente não recebe evento de outro tenant

- **WHEN** a conexão pertence ao tenant A e um evento `post:new` de um comunicado do tenant B é emitido no canal
- **THEN** o cliente do tenant A NÃO recebe esse evento (filtrado por `tenantId`)

#### Scenario: Cliente recebe apenas eventos do seu tenant

- **WHEN** a conexão pertence ao tenant A e um evento `post:new` de um comunicado do tenant A é emitido
- **THEN** o cliente do tenant A recebe o evento com o payload correspondente
