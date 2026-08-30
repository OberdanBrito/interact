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
| Média | 4 | 0 | 2 | 0 | 0 |
| Baixa | 3 | 0 | 3 | 0 | 0 |
| — | 0 | 0 | 0 | 1 | 3 |

**Total: 18 issues** (2 Alta — 1 aberta, 1 concluída —, 6 Média — 4 abertas, 2 concluídas —, 6 Baixa — 3 abertas, 3 concluídas —, 1 Adiada, 3 Fora de escopo)

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
- **Status:** Concluído
- **Registro:** backend `0a9e3b0` + `46e454c` (branch `backend`), frontend_admin `dbb22fd` + `36418a0` (branch `frontend_admin`), frontend_pwa `3be8ce2` (branch `frontend_pwa`). Verificado por teste de integração (Mongo real, 26/26) e validação visual (Playwright :5174). OpenSpec arquivado em `openspec/changes/archive/2026-08-29-rascunhos-comunicados`.
- **Decisão:** modelagem por flag `draft: Boolean` (estado derivado, compatível com scheduler/GET/PWA). Gate de publicação exige título, categoria, autor e conteúdo ao publicar um rascunho (decisão do dono no QA). Termo "null" eliminado das telas (autor/agendamento mostram vazio ou "—").
- **Critérios de aceite:**
  - [x] `POST /api/posts` aceita `status: "draft"`; drafts não aparecem para colaboradores
  - [x] Listagem do admin identifica rascunhos (selo + contador); botão "Publicar" converte draft em publicado
  - [x] Edição de draft não exige todos os campos obrigatórios

### I-03 — Anexos e imagens
- **Descrição:** permitir anexar arquivos/imagens ao comunicado (ex.: PDF, foto). Requer armazenamento (local via multer ou bucket) e renderização no PWA.
- **Componentes:** `backend` (rota posts + upload), `frontend_admin` (form-view), `frontend_pwa` (feed/templates)
- **Prioridade:** Média
- **Esforço:** L (1 semana+)
- **Status:** Aberto
- **Decisão/Obrigatoriedade:** anexo é **opcional** (nunca bloqueia criar/salvar rascunho/publicar/agendar); rascunho pode ter anexo.
- **Critérios de aceite:**
  - [ ] Admin anexa arquivo no formulário; `GET /api/posts/:id` retorna metadados do anexo
  - [ ] PWA exibe anexo com link de download/visualização
  - [ ] Anexo respeita a visibilidade do comunicado (não vaza para não-alvo; sem anexo → vazio, não "null")
  - [ ] Limites de tamanho/tipo documentados e validados (erro claro no admin)

### I-04 — Fixar comunicado importante
- **Descrição:** permitir fixar (pin) um comunicado no topo do feed, independente da ordenação inteligente.
- **Componentes:** `backend` (model Comunicado + rota posts), `frontend_admin` (list-view), `frontend_pwa` (feed.js sortFeed)
- **Prioridade:** Média
- **Esforço:** S (≤ 1 dia)
- **Status:** Concluída (30/08)
- **Decisões/Obrigatoriedade:** pin **opcional** (`pinned: boolean` default false); **D1** pin SÓ em publicados — `PUT /api/posts/:id` com `pinned` em rascunho/agendado → 400 "Apenas comunicados publicados podem ser fixados" e o admin não exibe a ação para não-publicados; **D2** pin é ação pós-publicação (`POST` não aceita `pinned`; toggle na listagem); **D3** múltiplos pinned ordenados por recência (`dateISO` desc); pin não reordena a listagem do admin nem a visão "Arquivo" do PWA (mantém data desc da I-12); selo aparece nas duas visões.
- **Resultado:** model `pinned` + `toPost` expõe; `GET /api/posts` `.sort({pinned:-1, dateISO:-1})`; selo "Fixado" e toggle Fixar/Desfixar no admin (só publicado); selo "Fixado" no card + `sortFeed` pin-primeiro (vence urgente) no PWA. Teste versionado `scripts/qa-i04.mjs` 19/19; QA visual PWA+admin ok. Commits: backend `33433e0`, admin `141b609`, pwa `5d5e589` (+ archive `406c289`/`a8c6b27`/`ce35b5d`).
- **Critérios de aceite:**
  - [x] Campo `pinned: true` no model; `GET /api/posts` ordena pinned primeiro
  - [x] Admin fixa/desfixa pela listagem (publicado); rascunho/agendado sem ação "Fixar"
  - [x] PWA mostra indicador visual de fixado; pinned vence urgente na ordenação
  - [x] Múltiplos pinned ordenados por recência (data desc)

### I-05 — Validade/expiração automática
- **Descrição:** permitir definir uma data de validade; ao expirar, o comunicado sai do feed automaticamente (sem delete).
- **Componentes:** `backend` (model Comunicado + rota posts), `frontend_admin` (form-view)
- **Prioridade:** Baixa
- **Esforço:** S (≤ 1 dia)
- **Status:** Concluída (30/08)
- **Decisão/Obrigatoriedade:** `expiresAt` **opcional** (nunca bloqueia criar, salvar rascunho, publicar ou agendar); expirado = `expiresAt < now` (derivado na consulta, sem scheduler — nada é deletado); colaborador NÃO vê, admin vê com selo "Expirado" (reativar = limpar `expiresAt`, mantém o estado atual); **D1 (interação I-12):** expirado some do feed **inteiro** do colaborador — feed, "Ativos" e "Arquivo" (expiração é mais forte que idade; conteúdo não mais válido não fica nem no histórico); **D2:** `status` não muda (rascunho/agendado/publicado) — validade é eixo separado; **D3:** `expiresAt` aceita data passada (expiração imediata), só formato inválido → 400; **D4:** sem validação cruzada `expiresAt` × `publishAt`.
- **Resultado:** model `expiresAt` + `toPost` expõe `expiresAt`/`expired`; `GET /api/posts` filtra expirados do colaborador em todas as visões; admin sem filtro (vê com `expired: true`); `GET /:id` de expirado → 404 para colaborador; POST/PUT aceitam/limpam `expiresAt` (backend). Campo "Validade (opcional)" no formulário (vazio = "" nunca "null"; limpar = reativa), selo "Expirado" + "Expira em …" na listagem (admin). Teste versionado `scripts/qa-i05.mjs` 25/25; QA visual PWA+admin ok. Commits: backend `4e8b9de`+`687fc46`, admin `83c188b`+`bf7cd95`.
- **Critérios de aceite:**
  - [x] Campo `expiresAt` opcional; colaborador não vê expirados; admin vê com selo "Expirado"
  - [x] Admin vê indicador "Expirado" na listagem e pode reativar (limpar `expiresAt`)
  - [x] Expiração não apaga o documento (histórico preservado)
  - [x] Sem `expiresAt` → campo vazio na UI (não "null")

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
- **Decisão/Obrigatoriedade:** e-mail dispara **somente na transição para `published: true`** (publicar agora, publicar rascunho ou liberação de agendado via scheduler I-01); nunca em rascunho; público = mesma regra de visibilidade (broadcast ∪ grupos).
- **Critérios de aceite:**
  - [ ] Publicação de comunicado dispara e-mail apenas para o público-alvo
  - [ ] Falha de envio não bloqueia a publicação (fila + retry)
  - [ ] E-mail contém título, resumo e link para o PWA
  - [ ] Agendado dispara e-mail no momento da liberação (não na criação)

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
  - [ ] Busca funciona **dentro do Arquivo** (critério I-12): a UI de busca deve combinar `?search` com `?archive=active|archived` da visão atual — hoje a busca no arquivo só existe no nível da API
  - [ ] Offline: busca cai para o cache do IndexedDB (filtro local, incluindo o corte por idade da I-12)

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
  - [ ] **Após I-12:** paginação deve respeitar a visão atual — request com `?archive` e ordenação da visão (sortFeed no "Ativos", `sortByDate` no "Arquivo")

### I-11 — Marcar como não-lido
- **Descrição:** permitir ao colaborador reverter a leitura de um comunicado (hoje só marca como lido).
- **Componentes:** `frontend_pwa` (interactions.js, session.js, feed, badge), `backend` (rota interactions)
- **Prioridade:** Baixa
- **Esforço:** S (≤ 1 dia)
- **Status:** Concluído
- **Registro:** backend `cd78403` + `751dbf2` (branch `backend`), frontend_pwa `1631541` + `c046ab6` (branch `frontend_pwa`). Verificado por teste de integração (Mongo real, 15/15) e validação visual (Playwright :5173). OpenSpec arquivado em `openspec/changes/archive/2026-08-29-marcar-como-nao-lido`.
- **Decisão:** ao reverter (`read: false`), o backend **limpa `readAt`** (null) — decisão do dono — para as métricas "quem leu" do admin refletirem a reversão; re-ler depois repreenche `readAt`. Ação "Marcar como não lido" entra nos templates compartilhados (card + sheet).
- **Critérios de aceite:**
  - [x] Ação "Marcar como não lido" no sheet; post volta para o grupo de não-lidos na ordenação
  - [x] Estado sincroniza ao backend (`PUT /api/interactions/:postId` com `read: false`)
  - [x] Badge de não-lidos recontado corretamente
  - [x] Métricas "quem leu" do admin refletem a reversão (`readAt` limpo ao reverter)

### I-12 — Arquivo/histórico de comunicados antigos
- **Descrição:** separar comunicados ativos de antigos (ex.: aba "Arquivo" ou filtro por período), hoje tudo aparece na mesma lista.
- **Componentes:** `frontend_pwa` (feed.js), `backend` (rota posts — filtro opcional)
- **Prioridade:** Baixa
- **Esforço:** S (≤ 1 dia)
- **Status:** Concluído
- **Registro:** backend `d024379` + `64f402c` (branch `backend`), frontend_pwa `20cc5db` + `a499a56` (branch `frontend_pwa`). Verificado por teste de integração (Mongo real, 11/11) e validação visual (Playwright :5173). OpenSpec arquivado em `openspec/changes/archive/2026-08-29-arquivo-de-comunicados`.
- **Decisão:** "antigo" = publicado há ≥ 30 dias (`ARCHIVE_AFTER_DAYS`, env-overridable), corte derivado da idade via `dateISO` — **sem** flag/arquivamento manual; aba/toggle "Ativos | Arquivo" no feed; admin ignora `?archive`; sem parâmetro preserva o comportamento atual; busca satisfeita no nível da API (PWA não tem UI de busca).
- **Dívida técnica:** `ARCHIVE_AFTER_DAYS` vive em 2 lugares (env do backend + constante `src/data/posts.js` no PWA). Se divergirem em prod, a UI rotula errado — sem enforcement (candidato a endpoint de config ou nota na I-10/Infra).
- **Critérios de aceite:**
  - [x] Filtro/aba de arquivo lista comunicados antigos sem poluir o feed principal
  - [x] Busca e visibilidade funcionam dentro do arquivo
  - [x] Sem impacto na ordenação inteligente do feed ativo

---

## Métricas

### I-13 — Dashboard global de métricas
- **Descrição:** visão geral no admin com todos os comunicados e indicadores (total, % lido, % curtido, por grupo) — hoje as métricas são por comunicado.
- **Componentes:** `backend` (rota interactions — adicionar filtros ao `summary`), `frontend_admin` (features/analytics)
- **Prioridade:** Média
- **Esforço:** M (2-3 dias)
- **Status:** Aberto
- **Contexto atual:** endpoint `GET /api/interactions/summary` JÁ EXISTE (`{ [postId]: { reads, likes } }`); falta adicionar filtros de período/grupo e a tela de dashboard. **Não re-implementar o endpoint.**
- **Após I-12:** o dashboard deve incluir comunicados arquivados no histórico (filtro por período cobrindo `dateISO` antigos) — decisão se arquivados entram nos totais por default.
- **Critérios de aceite:**
  - [ ] `GET /api/interactions/summary` aceita filtros de período (`desde`/`ate`) e `groupId`; retorna totais por comunicado/grupo
  - [ ] Tela de dashboard com cards e ranking de comunicados mais/menos lidos
  - [ ] Filtro por período e por grupo
  - [ ] Comunicado sem interações renderiza 0 (não "null")

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
4. Issues novas devem seguir o formato: ID sequencial, descrição, componentes, prioridade, esforço, status, critérios de aceite — **e sempre com o requisito no corpo**: `Respeitar estritamente a skill do fluxo da esteira de implementação.` O template `.github/ISSUE_TEMPLATE/issue_template.md` (na `main`) já traz o bloco preenchido; ao criar via API, inclua-o manualmente. Critérios devem definir obrigatoriedade **por ação por componente** (ex.: "ao publicar, título/categoria/autor/corpo obrigatórios; ao salvar rascunho, nenhum"), incluir **pré-condições de integração** entre componentes e o **comportamento de campos opcionais** (nunca exibir `null`/`undefined`/data epoch na UI).