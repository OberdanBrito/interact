## Purpose

Canal de tempo real compartilhado do backend para comunicados: expõe `GET /api/events` (SSE)
autenticado que transmite eventos de ciclo de vida de post (`post:new`, `post:updated`,
`post:expired`), com contrato genérico e reutilizável pela I-14 (assinar `interaction:changed` sem
um segundo endpoint nem uma segunda lib de conexão).

## ADDED Requirements

### Requirement: Expor canal SSE autenticado (GET /api/events)
O sistema SHALL expor um endpoint `GET /api/events` que responde um stream SSE
(`Content-Type: text/event-stream`) autenticado, mantendo a conexão aberta e transmitindo eventos
nomeados ao cliente.

- Autenticação SHALL aceitar o JWT via query param `?token=` (compatível com `EventSource`, que não
  envia `Authorization`) **e**/ou header `Authorization: Bearer <token>`; requisição sem token
  válido SHALL responder `401`.
- A resposta SHALL usar `Content-Type: text/event-stream`, `Cache-Control: no-cache` e
  `Connection: keep-alive`.
- O formato de evento SHALL ser SSE nomeado: linha `event: <nome>` seguida de `data: <json>`.
- O endpoint SHALL enviar um heartbeats/keep-alive periódico (comentário SSE `:keepalive` ou `data`
  próprio) para o cliente detectar conexão morta.

#### Scenario: Conectar canal com token válido
- **WHEN** um cliente autenticado chama `GET /api/events?token=<jwt>`
- **THEN** o servidor responde `200` com `Content-Type: text/event-stream`
- **AND** mantém a conexão aberta transmitindo eventos

#### Scenario: Conectar canal sem token válido
- **WHEN** um cliente chama `GET /api/events` sem token ou com token inválido
- **THEN** o servidor responde `401`

#### Scenario: Receber heartbeat
- **WHEN** um cliente permanece conectado ao canal sem novos eventos
- **THEN** o servidor envia um keep-alive a cada `SSE_HEARTBEAT_MS` (padrão 30s), sem encerrar a
  conexão

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
  do cliente (ex.: `id` e `dateISO`/`updatedAt`).

#### Scenario: Publicar novo comunicado emite post:new
- **WHEN** um admin cria e publica um comunicado via `POST /api/posts` (publicação imediata)
- **THEN** o servidor emite `post:new` com o payload do comunicado visível

#### Scenario: Liberar agendado emite post:new
- **WHEN** o scheduler (I-01) libera um comunicado agendado (`release`)
- **THEN** o servidor emite `post:new` para o comunicado recém-liberado

#### Scenario: Editar comunicado visível emite post:updated
- **WHEN** um admin edita um comunicado já publicado via `PUT /api/posts/:id`
- **THEN** o servidor emite `post:updated`

#### Scenario: Comunicado expirado emite post:expired
- **WHEN** o sistema detecta que um comunicado com `expiresAt` atingiu a validade (expiração
  derivada)
- **THEN** o servidor emite `post:expired` (sem deletar o documento)

#### Scenario: Rascunho/agendado não emite evento de feed
- **WHEN** um admin salva um rascunho ou cria um agendado que ainda não foi liberado
- **THEN** o servidor NÃO emite `post:new` (o comunicado permanece invisível ao colaborador)

### Requirement: Contrato genérico reutilizável
O canal SHALL NÃO ser acoplado a um tipo de evento: o endpoint transmite qualquer evento nomeado,
e a mesma infraestrutura de emissão/assinatura SHALL estar disponível para a I-14 assinar um evento
`interaction:changed` **sem criar um segundo endpoint nem uma segunda lib de conexão**.

- Um cliente pode assinar/ignorar eventos por nome; um evento que o cliente não reconhece SHALL ser
  ignorado sem erro.

#### Scenario: Cliente assina apenas o evento de interesse
- **WHEN** um cliente conectado NÃO reconhece um evento `interaction:changed` recebido
- **THEN** o cliente ignora o evento sem erro e sem quebrar a conexão

#### Scenario: Canal emite evento além dos de post
- **WHEN** a I-14 emite um evento nomeado adicional no mesmo emitter
- **THEN** o mesmo endpoint `GET /api/events` o transmite, sem um segundo endpoint

### Requirement: Não regredir operações existentes
Emitir eventos SHALL NÃO alterar o contrato nem o comportamento de `GET/POST/PUT /api/posts` e de
`PUT /api/interactions/:postId`. A emissão é adicional; uma falha ao emitir/transmitir um evento
SHALL **NÃO** quebrar a mutação de post/interação — o feed e as interações continuam funcionando
sem o canal.

#### Scenario: Falha ao transmitir evento não quebra a mutação
- **WHEN** não há cliente conectado (ou a transmissão falha) durante um `POST /api/posts`
- **THEN** a criação do comunicado SHALL responder normalmente (201/200) sem depender do canal

### Requirement: Tolerar (re)conexões do cliente
O sistema SHALL permitir múltiplas conexões concorrentes e (re)conexões sem intervenção: quando
uma conexão SSE cai, o cliente pode reconectar e o servidor SHALL manter/retomar o serviço sem
erro, descartando clientes desconectados.
- O fallback para polling (60s) após **3 falhas de SSE** seguidas é o contrato do cliente (PWA),
  mas o servidor SHALL suportar a reconexão que esse fallback retoma.

#### Scenario: Cliente reconecta após queda
- **WHEN** um cliente cai/volta e reconecta ao canal
- **THEN** o servidor aceita a nova conexão e volta a transmitir eventos normalmente

#### Scenario: Cliente desconectado é descartado
- **WHEN** a conexão de um cliente é encerrada (rede instável / app em background)
- **THEN** o servidor limpa o cliente da lista de transmissão sem erro
