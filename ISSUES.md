# INTERACT - CONTROLE DE IMPLEMENTAÇÃO (ISSUES)

Documento de acompanhamento das lacunas do produto em relação à comunicação
unidirecional empresa → colaborador. Cada issue descreve o que falta, onde
implementar e como verificar. Atualize o status ao iniciar/concluir cada item.

## Legenda de status

| Status | Significado |
|---|---|
| `Aberto` | Não iniciado |
| `Em andamento` | Implementação em curso |
| `Concluído` | Implementado e verificado |
| `Adiado` | Decisão de não fazer agora (motivo registrado) |
| `Fora de escopo` | Não será feito (anti-padrão do produto) |

## Resumo

| Prioridade | Aberto | Em andamento | Concluído | Adiado | Fora de escopo |
|---|---|---|---|---|---|
| Alta | 1 | 0 | 1 | 0 | 0 |
| Média | 6 | 0 | 0 | 0 | 0 |
| Baixa | 6 | 0 | 0 | 0 | 0 |
| — | 0 | 0 | 0 | 1 | 3 |

**Total: 18 issues** (2 Alta — 1 aberta, 1 concluída —, 6 Média, 6 Baixa, 1 Adiada, 3 Fora de escopo)

## Vínculo com GitHub

As issues acionáveis (I-01 a I-15) estão registradas no repositório
[OberdanBrito/interact](https://github.com/OberdanBrito/interact/issues) — o
**status no GitHub é a fonte de verdade** para acompanhamento. Este arquivo
mantém o contexto completo (descrição, componentes, critérios de aceite).

| Issue | GitHub |
|---|---|
| I-01 Agendamento de publicação | [#1](https://github.com/OberdanBrito/interact/issues/1) |
| I-02 Rascunhos | [#2](https://github.com/OberdanBrito/interact/issues/2) |
| I-03 Anexos e imagens | [#6](https://github.com/OberdanBrito/interact/issues/6) |
| I-04 Fixar comunicado importante | [#8](https://github.com/OberdanBrito/interact/issues/8) |
| I-05 Validade/expiração automática | [#11](https://github.com/OberdanBrito/interact/issues/11) |
| I-06 Notificações push (adiado) | [#3](https://github.com/OberdanBrito/interact/issues/3) |
| I-07 Atualização em tempo real | [#5](https://github.com/OberdanBrito/interact/issues/5) |
| I-08 E-mail como fallback | [#9](https://github.com/OberdanBrito/interact/issues/9) |
| I-09 Busca no PWA | [#12](https://github.com/OberdanBrito/interact/issues/12) |
| I-10 Paginação / infinite scroll | [#14](https://github.com/OberdanBrito/interact/issues/14) |
| I-11 Marcar como não-lido | [#4](https://github.com/OberdanBrito/interact/issues/4) |
| I-12 Arquivo/histórico | [#7](https://github.com/OberdanBrito/interact/issues/7) |
| I-13 Dashboard global de métricas | [#10](https://github.com/OberdanBrito/interact/issues/10) |
| I-14 Recibo de leitura em tempo real | [#13](https://github.com/OberdanBrito/interact/issues/13) |
| I-15 Cobrança de leitura | [#15](https://github.com/OberdanBrito/interact/issues/15) |

Labels usadas: `prioridade: alta|media|baixa`, `area: publicacao|entrega|leitura|metricas`, `adiado`.

### Melhorias de plataforma (Projeto "Infra")

Issues de infraestrutura, CI/CD, performance, dependências e segurança ficam no
projeto **Infra** (Projects v2 #10, [board](https://github.com/users/OberdanBrito/projects/10)) — não na
fila funcional deste documento.

| Issue | GitHub | Projeto |
|---|---|---|
| Deploy de produção (CI/CD, PM2/Docker/systemd, secrets, HTTPS, backup) | [#16](https://github.com/OberdanBrito/interact/issues/16) | Infra (#10) |

---

## Publicação

### I-01 — Agendamento de publicação
- **Descrição:** permitir que o admin defina uma data/hora futura para o comunicado ir ao ar. Até lá, o post fica visível apenas para o admin (indicador "Agendado"); colaboradores só o veem após a liberação.
- **Componentes:** `backend` (model Comunicado + scheduler + rota posts), `frontend_admin` (form-view, listagem)
- **Prioridade:** Alta
- **Esforço:** M (2-3 dias)
- **Status:** Concluído
- **Registro:** backend `b49ebf5` (branch `backend`), frontend_admin `6ac971b` (branch `frontend_admin`). Verificado por teste de integração (Mongo real) e validação visual (Playwright/Chrome DevTools); scheduler libera o post no horário definido sem ação manual.
- **Decisão:** mecanismo único `node-schedule` (one-shot + reconcile a cada minuto). Admin vê agendados na própria listagem com selo "Agendado" e pode reagendar até a liberação.
- **Critérios de aceite:**
  - [x] `POST /api/posts` aceita `publishAt`; posts com `publishAt` futuro ficam `published:false` e não aparecem para colaboradores
  - [x] Formulário do admin tem campo de data/hora opcional; comunicado agendado aparece com indicador "Agendado" na listagem
  - [x] Ao chegar a data, o post aparece no feed sem ação manual

### I-02 — Rascunhos
- **Descrição:** permitir salvar um comunicado incompleto sem publicar. Rascunho visível apenas para o admin que o criou.
- **Componentes:** `backend` (model Comunicado + rota posts), `frontend_admin` (form-view, list-view)
- **Prioridade:** Média
- **Esforço:** M (2-3 dias)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] `POST /api/posts` aceita `status: "draft"`; drafts não aparecem para colaboradores
  - [ ] Listagem do admin separa/identifica rascunhos; botão "Publicar" converte draft em publicado
  - [ ] Edição de draft não exige todos os campos obrigatórios

### I-03 — Anexos e imagens
- **Descrição:** permitir anexar arquivos/imagens ao comunicado (ex.: PDF, foto). Requer armazenamento (local via multer ou bucket) e renderização no PWA.
- **Componentes:** `backend` (rota posts + upload), `frontend_admin` (form-view), `frontend_pwa` (feed/templates)
- **Prioridade:** Média
- **Esforço:** L (1 semana+)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Admin anexa arquivo no formulário; `GET /api/posts/:id` retorna metadados do anexo
  - [ ] PWA exibe anexo com link de download/visualização
  - [ ] Anexo respeita a visibilidade do comunicado (não vaza para não-alvo)

### I-04 — Fixar comunicado importante
- **Descrição:** permitir fixar (pin) um comunicado no topo do feed, independente da ordenação inteligente.
- **Componentes:** `backend` (model Comunicado + rota posts), `frontend_admin` (list-view), `frontend_pwa` (feed.js sortFeed)
- **Prioridade:** Média
- **Esforço:** S (≤ 1 dia)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Campo `pinned: true` no model; `GET /api/posts` ordena pinned primeiro
  - [ ] Admin fixa/desfixa pela listagem
  - [ ] PWA mostra indicador visual de fixado; pinned vence urgente na ordenação

### I-05 — Validade/expiração automática
- **Descrição:** permitir definir uma data de validade; ao expirar, o comunicado sai do feed automaticamente (sem delete).
- **Componentes:** `backend` (model Comunicado + rota posts), `frontend_admin` (form-view)
- **Prioridade:** Baixa
- **Esforço:** S (≤ 1 dia)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Campo `expiresAt` opcional; `GET /api/posts` filtra expirados
  - [ ] Admin vê indicador "Expirado" na listagem e pode reativar
  - [ ] Expiração não apaga o documento (histórico preservado)

---

## Entrega

### I-06 — Notificações push
- **Descrição:** avisar o colaborador sobre novos comunicados via push (Web Push / FCM).
- **Componentes:** `backend` (subscriptions + web-push), `frontend_pwa` (service worker)
- **Prioridade:** — (Adiada)
- **Esforço:** L (1 semana+)
- **Status:** Adiado
- **Motivo:** decisão do usuário — depende de servidores externos (VAPID/FCM). O badge de não-lidos (Badging API) é o substituto parcial atual.
- **Critérios de aceite (quando retomado):**
  - [ ] Colaborador opt-in de permissão; backend guarda subscription por usuário
  - [ ] Novo comunicado dispara push apenas para o público-alvo (respeita targetGroups)
  - [ ] Clique no push abre o comunicado no PWA

### I-07 — Atualização em tempo real de novos comunicados
- **Descrição:** o PWA hoje busca posts apenas no load/render. Adicionar polling periódico (ou SSE/websocket) para novos comunicados aparecerem sem reload manual.
- **Componentes:** `frontend_pwa` (data/posts.js, feed.js), `backend` (opcional: SSE)
- **Prioridade:** Média
- **Esforço:** M (2-3 dias)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Novo comunicado publicado aparece no feed do colaborador elegível em ≤ 60s sem interação
  - [ ] Polling pausa quando a aba está oculta (economia de bateria)
  - [ ] Sem regressão no cache offline e no badge

### I-08 — E-mail como fallback de notificação
- **Descrição:** enviar e-mail ao colaborador quando um comunicado for direcionado a ele (fallback para quem não usa o app).
- **Componentes:** `backend` (serviço de e-mail + fila)
- **Prioridade:** Baixa
- **Esforço:** L (1 semana+)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Publicação de comunicado dispara e-mail apenas para o público-alvo
  - [ ] Falha de envio não bloqueia a publicação (fila + retry)
  - [ ] E-mail contém título, resumo e link para o PWA

---

## Leitura

### I-09 — Busca no PWA
- **Descrição:** campo de busca no feed do colaborador. O backend JÁ suporta (`GET /api/posts?search=` — regex em título e autor); falta apenas a UI no PWA.
- **Componentes:** `frontend_pwa` (feed.js, templates)
- **Prioridade:** Alta
- **Esforço:** S (≤ 1 dia)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Campo de busca no feed; digitar filtra por título/autor via `?search=`
  - [ ] Busca respeita visibilidade (grupos) e o seletor de ambiente ativo
  - [ ] Offline: busca cai para o cache do IndexedDB (filtro local)

### I-10 — Paginação / infinite scroll
- **Descrição:** o feed carrega todos os comunicados de uma vez. Adicionar paginação (limit/offset ou cursor) para escalar com volume.
- **Componentes:** `backend` (rota posts), `frontend_pwa` (feed.js), `frontend_admin` (list-view)
- **Prioridade:** Média
- **Esforço:** M (2-3 dias)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] `GET /api/posts` aceita `limit`/`offset` (defaults compatíveis com o comportamento atual)
  - [ ] PWA carrega mais posts ao rolar (infinite scroll) sem duplicar
  - [ ] Ordenação inteligente e badge continuam corretos com dados paginados

### I-11 — Marcar como não-lido
- **Descrição:** permitir ao colaborador reverter a leitura de um comunicado (hoje só marca como lido).
- **Componentes:** `frontend_pwa` (interactions.js, session.js), `backend` (rota interactions)
- **Prioridade:** Baixa
- **Esforço:** S (≤ 1 dia)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Ação "Marcar como não lido" no sheet; post volta para o grupo de não-lidos na ordenação
  - [ ] Estado sincroniza ao backend (`PUT /api/interactions/:postId` com `read: false`)
  - [ ] Badge de não-lidos recontado corretamente

### I-12 — Arquivo/histórico de comunicados antigos
- **Descrição:** separar comunicados ativos de antigos (ex.: aba "Arquivo" ou filtro por período), hoje tudo aparece na mesma lista.
- **Componentes:** `frontend_pwa` (feed.js), `backend` (rota posts — filtro opcional)
- **Prioridade:** Baixa
- **Esforço:** S (≤ 1 dia)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Filtro/aba de arquivo lista comunicados antigos sem poluir o feed principal
  - [ ] Busca e visibilidade funcionam dentro do arquivo
  - [ ] Sem impacto na ordenação inteligente do feed ativo

---

## Métricas

### I-13 — Dashboard global de métricas
- **Descrição:** visão geral no admin com todos os comunicados e indicadores (total, % lido, % curtido, por grupo) — hoje as métricas são por comunicado.
- **Componentes:** `backend` (rota interactions — endpoint agregado), `frontend_admin` (features/analytics)
- **Prioridade:** Média
- **Esforço:** M (2-3 dias)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Endpoint agregado (ex.: `GET /api/interactions/summary`) retorna totais por comunicado/grupo
  - [ ] Tela de dashboard com cards e ranking de comunicados mais/menos lidos
  - [ ] Filtro por período e por grupo

### I-14 — Recibo de leitura individual em tempo real
- **Descrição:** hoje o admin vê quem leu/curtiu (agregado por usuário), mas sem atualização em tempo real. Requer polling/SSE no admin.
- **Componentes:** `backend` (SSE opcional), `frontend_admin` (features/analytics/detail-view)
- **Prioridade:** Baixa
- **Esforço:** M (2-3 dias)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Lista de quem leu/curtiu atualiza sem reload manual (≤ 60s)
  - [ ] Sem regressão no endpoint `GET /api/interactions/members`

### I-15 — Cobrança de leitura (lembrete para quem não leu)
- **Descrição:** permitir ao admin "cobrar" leitura de comunicados importantes — listar quem não leu e (futuramente) re-notificar.
- **Componentes:** `backend` (rota interactions), `frontend_admin` (features/analytics)
- **Prioridade:** Baixa
- **Esforço:** S (≤ 1 dia)
- **Status:** Aberto
- **Critérios de aceite:**
  - [ ] Tela "Quem não leu" por comunicado (complemento do members atual)
  - [ ] Ação de cobrança registra evento (auditável) e lista os destinatários pendentes

---

## Não-objetivos (fora de escopo)

| Item | Motivo |
|---|---|
| Comentários / respostas em comunicados | Quebra a comunicação unidirecional empresa → colaborador |
| Chat / DM / mensageria | Feature nova, fora do escopo do produto |
| Perfis públicos de colaboradores | Não existe e não será criado |
| Push notifications | Adiado (I-06) — depende de servidores externos |

---

## Instruções de uso

1. Ao **iniciar** uma implementação: marque a issue como `Em andamento` e anote a data.
2. Ao **concluir**: rode os critérios de aceite, **registre as atividades na issue do GitHub** (comentário estruturado: resumo, atividades com datas, evidências, decisões e critérios de aceite — exemplo na issue #1 da I-01), mova-a para `Concluído`/Done e anote o commit/branch.
3. Ao **descartar**: mova para `Fora de escopo` com o motivo, ou `Adiado` com a condição de retomada.
4. Issues novas devem seguir o formato: ID sequencial, descrição, componentes, prioridade, esforço, status, critérios de aceite — **e sempre com o requisito no corpo**: `Respeitar estritamente a skill do fluxo da esteira de implementação.` O template `.github/ISSUE_TEMPLATE/issue_template.md` (na `main`) já traz o bloco preenchido; ao criar via API, inclua-o manualmente.