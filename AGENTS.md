# INTERACT - BASE DE CONHECIMENTO DO SISTEMA

## OVERVIEW
Interact: plataforma de comunicação interna entre empresa e colaboradores.
Stack: Node.js + Express 5 + MongoDB (Mongoose) + JWT no backend; Vite vanilla JS nos dois frontends.

## FUNCIONALIDADE ÚNICA (LEIA PRIMEIRO)
A funcionalidade principal do produto é **comunicação unidirecional: empresa → colaborador**.
A empresa publica comunicados; colaboradores leem. Nada mais. **Exceção parcial:** interações de leitura e curtida do colaborador agora sincronizam de volta ao backend (bidirecional), para o admin ver métricas — mas não há conteúdo enviado pelo colaborador nem conversa.

O que existe:
- Admin autenticado cria/edita/remove comunicados (com categorias, **grupos-alvo** e modo de leitura). Pode salvar **rascunho** (`status: "draft"`, campo `draft: true` no model) com campos incompletos — só o admin que o criou vê; publicar rascunho exige título, categoria, autor e conteúdo. Pode **agendar publicação** (I-01): `publishAt` futuro fica `published: false`/`status: "agendado"` até o scheduler liberar no horário. Pode definir **validade** (I-05): `expiresAt` opcional; ao expirar, o comunicado sai do feed do colaborador automaticamente (sem delete) — o admin vê com selo "Expirado" e reativa limpando o campo.
- **Segmentação por grupo**: `targetGroups: []` = broadcast; preenchido = exclusivo (união dos grupos). Colaborador vê broadcast + direcionados aos seus grupos; admin vê só o que publicou (`createdBy`).
- Colaborador autenticado lê o feed (com **ordenação inteligente**: urgentes → não-lidos → recentes), curte, confirma leitura e pode **marcar como não lido** (reverter a leitura).
- **Cache offline (Dexie)**: posts ficam disponíveis sem conexão; interações sincronizam ao backend (`PUT /api/interactions/:postId`) com fila offline; admin vê agregados por comunicado (`GET /api/interactions?postId=`) e por usuário (`GET /api/interactions/members`).
- **Badge de não-lidos** no ícone do app instalado (Badging API, 100% client-side).

O que NÃO existe:
- Mensagens diretas (DM), chat, conversas, threads, respostas a comunicados.
- Notificações push de mensagens. Comunicação bidirecional de conteúdo.
- Verificado na API: `/api/messages`, `/api/chat`, `/api/conversations`, `/api/inbox` → todos 404.

Se um pedido envolver "enviar e receber mensagens", isso é feature NOVA, fora do escopo atual. Sinalize antes de planejar.

## ESTRUTURA
O repositório é **branch-based**: `main` contém só documentação/estado do
projeto; o código vive em **branches vivas por componente** (worktrees) aninhadas
na pasta do projeto, sob o caminho canônico `/home/oberdan/WebstormProjects/interact/`
(vale para todos os dispositivos):

```
interact/                      (main – docs: AGENTS.md, ISSUES.md, README.md)
├── backend/           branch viva `backend`          API REST + MongoDB (Express 5, Mongoose, JWT)
├── frontend_admin/    branch viva `frontend_admin`   painel administrativo (Vite vanilla JS)
└── frontend_pwa/      branch viva `frontend_pwa`     PWA do colaborador (Vite + vite-plugin-pwa)
```

Cada worktree está na sua branch viva com tracking de `origin/<branch>` (não é
detached HEAD). Commits de todas as issues acumulam na branch da componente.

**Espelho via symlink (dispositivo sem WebStorm):** neste Linux, `/home/oberdan/WebstormProjects/interact/`
é um espelho por symlinks dos diretórios reais sob `/home/oberdan/projetos/`
(`projetos/interact` = main; `projetos/{backend,frontend_admin,frontend_pwa}` = worktrees).
Os dois caminhos funcionam; o git resolve symlinks e reporta os caminhos reais
(`git worktree list`, `git rev-parse --show-toplevel`). Artefatos não-rastreados da main
(`dist/`, `node_modules/`, `qa-*.png`, `.playwright-mcp/`) são sobras da época em que a
pasta era cópia do frontend_pwa: ignorar, não editar, não commitar.

## COMPONENTES

### backend/
API REST + MongoDB. Express 5, Mongoose, JWT, bcrypt, CORS, node-schedule.
- Porta padrão 3001; roda em 3002 via env `PORT`.
- Rotas: `/api/auth/login`, `/api/posts` (CRUD completo), `/api/categories`, `/api/groups`, `/api/interactions`; `/health` (sem auth).
- Models: `Comunicado`, `User`, `Group`, `Interaction`. Middleware de auth JWT. `_id` do Comunicado é string customizada sequencial (`p01`, `p02`, … — gerada na rota).
- Scripts: `dev` (node --watch src/server.js), `start`, `seed`, `db:reset` (docker compose down -v && up -d && seed), `test:integration` (qa-i11 + qa-i12 + qa-i04, Mongo real), `qa:i12`, `qa:i04`.
- MongoDB sobe via docker-compose.
- **Cuidado — sobras commitadas na branch `backend`:** a branch carrega cópia antiga do frontend_pwa — `index.html`, `vite.config.js`, `styles.css` e `src/{feed,sheet,toast,main,pwa,state,templates,autoread,data,utils,session,interactions}.js` (+ `scripts/qa-pwa.mjs`, `scripts/gen_icons.py`) são código morto. Ex.: `src/interactions.js` é o feature do PWA, NÃO a rota. O backend real é `src/server.js` → `src/app.js` → `src/routes/`.

### frontend_admin/
Painel administrativo. Vite vanilla JS. Porta dev 5174. Sem testes.
- Views: login, lista de posts, formulário de post (criar/editar), modal, toast, grupos, métricas.
- Features: auth (login-view, session), posts (form-view, list-view), groups (list-view, form-view), analytics (list-view, detail-view), data/posts.js, data/groups.js.

### frontend_pwa/
PWA do colaborador. Vite + vite-plugin-pwa. Porta dev 5173.
- Views: login, feed, bottom sheet (detalhe do post), toast, banner de instalação.
- Features: auth/session, feed (seletor de ambiente, chips de categoria, ordenação inteligente, cards, autoread), interactions (curtir, confirmar leitura, marcar como não lido), notifications/badge (Badging API), install/pwa.
- Dados: data/posts.js (API REST), data/cache.js (cache offline Dexie), data/sync.js (fila offline de interações).
- Scripts: `dev`, `build`, `preview`, `qa` (scripts/qa-pwa.mjs), E2E (scripts/e2e-admin-to-pwa.mjs, e2e-admin-ui-to-pwa.mjs), QA focados (scripts/qa-offline-cache.mjs, qa-offline-collab.mjs, qa-badge-sort.mjs).

## FLUXO DE TRABALHO
> **Obrigatório para todas as issues**: siga estritamente a skill da esteira de implementação
> (`.opencode/skills/esteira-implementacao/SKILL.md`, presente em cada worktree). Requisito gravado também em todas
> as issues em aberto. A conformidade é verificada periodicamente pelo desenvolvedor dono do
> projeto — nenhum portão pode ser pulado, e desvios devem ser reportados.

Por issue funcional (I-01…I-15, projetos v2 #8):
1. **Contexto** — consultar o knowledge graph (megamemory) e usar o status do GitHub (Projects v2) como fonte de verdade.
2. **Planejamento (OpenSpec)** — por componente afetada, rodar `opsx-propose` na sua worktree (`openspec/`). Gera `proposal.md`, `specs/<capability>/spec.md` (delta — critérios de aceite da issue), `design.md` e `tasks.md`. **Nada de código antes disso** (boundary de planejamento).
3. **Implementação (OpenSpec)** — `opsx-apply` implementa task a task a partir de `tasks.md`. Depois do apply, commit por componente por issue (português, PLAIN, com id da issue).
4. **Teste** — integração no MongoDB real (docker) + `npm run build`/`node --check`.
5. **Validação visual (obrigatória)** — navegadores MCP (Playwright `:5173`/admin `:5174`) cobrindo o fluxo real; screenshots em `/tmp/opencode/`.
6. **Push** — `git push` para `origin/<componente>`, incluindo o `openspec/`.
7. **Archive (OpenSpec)** — `opsx-archive` move a change aprovada para `openspec/specs/`.
8. **Encerramento** — no GitHub: registrar **atividades na issue** (comentário estruturado com resumo, atividades com datas, evidências, decisões e critérios de aceite), mover a issue pro-v2 Todos→Done e fechá-la; depois atualizar `ISSUES.md` e este `AGENTS.md` na `main` e push.
9. **Memória** — gravar conceitos no megamemory (record) ao concluir.

OpenSpec está configurado nas 3 componentes (`openspec/config.yaml` schema
spec-driven + comandos `opsx-*` e skills em `.opencode/`). Mapeamento: **1 change
por componente por issue** (ex.: I-02 → change backend + change admin). As
branches vivas são `backend`, `frontend_admin`, `frontend_pwa`.

Melhorias de plataforma (CI/CD, performance, dependências, segurança, deploy)
entram como issues do projeto **Infra** (Projects v2 #10), não na fila funcional.

## FLUXO DE DADOS
1. Admin publica comunicado no frontend_admin (com grupos-alvo; modal de confirmação com contagem de destinatários).
2. `POST /api/posts` → backend grava no MongoDB (`targetGroups`, `createdBy` do token).
3. Colaborador abre o PWA → `GET /api/posts` (filtrado por visibilidade; `?groupId=X` por ambiente) → feed renderiza (urgentes → não-lidos → recentes). Posts são cacheados no IndexedDB (Dexie) para leitura offline.
4. Colaborador curte/confirma leitura → grava no localStorage (instantâneo) e sincroniza ao backend (`PUT /api/interactions/:postId`), com fila offline reenviada no evento `online`.
5. Admin consulta métricas por comunicado (`GET /api/interactions?postId=`) e quem leu/curtiu (`GET /api/interactions/members`).
Autenticação JWT em ambos os frontends. Nenhum conteúdo flui do colaborador ao admin — apenas métricas de interação.

## ONDE ENCONTRAR
| Tarefa | Local |
|---|---|
| Login/autenticação | `backend` rota `/api/auth/login`; `auth/` nos dois frontends |
| CRUD de comunicados | `backend` rota `/api/posts`; `frontend_admin` features/posts |
| Segmentação por grupo | `backend` rotas `/api/groups` + filtro em `/api/posts`; `frontend_admin` features/groups; `frontend_pwa` features/feed (seletor de ambiente) |
| Feed do colaborador | `frontend_pwa` features/feed |
| Curtir / confirmar leitura | `frontend_pwa` features/interactions (localStorage + sync ao backend) |
| Fila offline de interações | `frontend_pwa` data/sync.js |
| Cache offline de posts (Dexie) | `frontend_pwa` data/cache.js |
| Badge de não-lidos | `frontend_pwa` features/notifications/badge.js |
| Métricas de leitura/curtida (admin) | `backend` rota `/api/interactions`; `frontend_admin` features/analytics |
| Categorias | `backend` rota `/api/categories` (estáticas) |
| Arquitetura detalhada | `ARCHITECTURE.md` e `DESIGN.md` em cada projeto |

## CONVENÇÕES
- Interações (curtir, leitura) persistem em localStorage do cliente **e** sincronizam ao backend (fonte de verdade do agregado); fila offline em `interact.syncQueue`.
- **Arquivo de comunicados (I-12)**: feed separado por aba "Ativos | Arquivo" (`state.archive`, `renderArchiveTabs`). "Antigo" = publicado há ≥ `ARCHIVE_AFTER_DAYS` dias (default 30; env no backend, constante espelhada no PWA `src/data/posts.js`); corte derivado da idade via `dateISO` (sem flag no schema). Backend `GET /api/posts?archive=active|archived` (colaborador; admin ignora; ausência do parâmetro preserva o comportamento atual; combina com `category`/`search`/`groupId`). "Ativos" usa a ordenação inteligente; "Arquivo" ordena por data desc (`sortByDate`). Interações (curtir/ler/marcar não lido) funcionam no arquivo e não reordenam para o feed ativo. Offline: cache Dexie guarda o último recorte buscado.
- **Reverter leitura (I-11)**: ação "Marcar como não lido" (`.js-unread`) aparece no card e no sheet quando o post está lido (`actionButtonsHTML`); `markUnreadPersist` remove o postId da lista `read` local, enfileira `{ read: false }` e `renderFeed()` reordena o feed (volta ao grupo de não-lidos) e `refreshBadge()` recontam o badge. Backend limpa `readAt` (null) ao reverter (`read: false`); re-ler repreenche `readAt`. Métricas "quem leu" (`/api/interactions/members`) refletem a reversão.
- **Fixar comunicado (I-04)**: `pinned: boolean` (default false) no model, exposto no payload; `GET /api/posts` ordena pinned primeiro (`.sort({pinned:-1, dateISO:-1})`, múltiplos pinned por recência). Pin SÓ em publicados — `PUT /api/posts/:id` com `pinned` em rascunho/agendado retorna 400 "Apenas comunicados publicados podem ser fixados" e o admin não exibe a ação para não-publicados (`js-pin` só em `status === "publicado"`, selo `badge-pinned`). PWA: selo "Fixado" no card e `sortFeed` com pin como 1ª chave (vence urgência); arquivo mantém data desc. `POST` não aceita `pinned`.
- **Validade/expiração (I-05)**: `expiresAt` opcional (default null) no model, exposto no payload como `expiresAt` (ISO|null) + `expired` derivado (`expiresAt != null && expiresAt < now`). Sem scheduler — expiração é derivada na consulta (nada é deletado; histórico preservado). Colaborador NUNCA vê expirado: `GET /api/posts` filtra em todas as visões (feed, `archive=active|archived` — expiração é mais forte que idade) e `GET /:id` de expirado → 404; admin não filtra (vê com `expired: true`). Reativar = limpar `expiresAt` (PUT com `expiresAt: ""`/null), mantendo o estado atual (ex.: publicado). `expiresAt` aceita data passada (expiração imediata); formato inválido → 400; nunca bloqueia criar/rascunho/publicar/agendar. Admin: campo "Validade (opcional)" no formulário (vazio = "" nunca "null"; limpar = reativa), selo `badge-expired` + linha "Expira em …" na listagem.
- **Anexos (I-03)**: `Comunicado.attachments: [{id, name, type, size, url}]` (metadados; binário em `uploads/` via multer, gitignorado; `_id:false` no subdocumento). Endpoints sob `/api/posts/:id/attachments`: `POST` (upload admin, multipart, 201), `GET /:attachmentId` (serve binário com a **mesma visibilidade do comunicado** — helper `isPostEligible`; não-elegível/inexistente → 404, sem vazar), `DELETE /:attachmentId` (remove metadado + binário). Anexo **sempre opcional** (nunca bloqueia criar/rascunho/publicar/agendar); em rascunho, invisível ao colaborador. Limites no backend como fonte de verdade: `MAX_ATTACHMENT_MB` (padrão 10, env) + tipos permitidos (pdf/png/jpeg/gif/webp) em `src/upload.js`; admin espelha para UX (erro claro). `attachments` nunca `null` (ausência → `[]`; UI vazio/"—"). PWA: lista de anexos no bottom sheet; download via `fetch` autenticado em blob (token nunca na URL); cache offline só de metadados (binário não cacheado, no-op gracioso).
- **Segmentação**: `targetGroups: []` = broadcast; preenchido = exclusivo (união). `targetGroups`/`groupIds` guardam `Group._id` como string. Alvo imutável APÓS publicação (400 no PUT); rascunho/agendado (`published === false`) ainda pode editá-lo.
- **Rascunhos (I-02)**: estado derivado no model — `draft === true` ⇒ `published: false` e `publishAt: null`; `toPost` reporta `status: "rascunho"`. `title`/`categoryId` não são mais `required` no schema (defaults `""`/`"geral"`); a obrigatoriedade é validada na rota apenas para não-rascunho. Publicar rascunho (`status: "published"` no PUT) exige título, categoria, autor (nome) e corpo não vazio (valores efetivos payload|doc). Rascunho invisível ao colaborador (filtro `published: true` no GET).
- **Agendamento (I-01)**: `publishAt` futuro no POST/PUT ⇒ `published: false` e `status: "agendado"` (só o admin vê, com selo "Agendado"); `dateISO = publishAt` (posiciona o post na ordem certa do feed ao liberar). Liberação via `src/scheduler.js` (node-schedule): `schedulePublish` no create/update, `reconcile` no boot (publica vencidos, re-agenda futuros — timers não sobrevivem restart) + tick de segurança a cada minuto. `publishAt` passado/inválido → 400; limpar `publishAt` numa edição = publicar agora; rascunho nunca agenda.
- **Visibilidade**: colaborador vê broadcast + direcionados aos seus grupos; sem grupo → só broadcast; admin → só o que publicou (`createdBy`). `GET /:id` não elegível → 404 (não 403).
- **Cache offline**: posts em IndexedDB (`interact-cache`, Dexie); `clearCache` no logout (não vazar entre usuários).
- **Badge de não-lidos**: Badging API (`navigator.setAppBadge`), no-op gracioso fora de PWA instalado.
- Categorias estáticas: Geral, RH, TI, Benefícios.
- `readMode` do Comunicado: `auto` (lido por dwell de 3s ou scroll até o fim) ou `ack` (botão explícito "Confirmar leitura").
- Docs de arquitetura: ARCHITECTURE.md e DESIGN.md em cada projeto.
- Commits em português, estilo PLAIN (sem prefixo semântico).

## ANTI-PADRÕES / NÃO EXISTE
- Mensageria: chat, DM, conversas, threads, respostas a comunicados.
- Notificações push de mensagens.
- Comunicação bidirecional (colaborador → empresa).
- Perfis públicos de colaboradores.
- Não proponha features dessa lista sem sinalizar que são novas e fora do escopo atual.

## COMANDOS
| Componente | Dev | Build | Test/QA |
|---|---|---|---|
| backend | `npm run dev` | - | `npm run test:integration` (Mongo real), `npm run seed`, `npm run db:reset` |
| frontend_admin | `npm run dev` (:5174) | `npm run build` | sem testes |
| frontend_pwa | `npm run dev` (:5173) | `npm run build` | `npm run qa`, scripts E2E |

## NOTAS
- Ambiente dev local: backend :3002 (env `PORT`, log `/tmp/interact-api.log`), PWA :5173 (`/tmp/interact-pwa.log`), admin :5174 (`/tmp/interact-admin.log`); dev servers via `npm run dev -- --port <X> --strictPort`.
- **Backend dev:** `npm run dev` usa `node --watch`; se subir com `npm run start` (sem watch), **reiniciar após mudanças** (o QA visual roda contra o código carregado). Comando para subir destacado do shell (não morre com o fim do comando):
  `cd /home/oberdan/WebstormProjects/interact/backend && setsid nohup env PORT=3002 node src/server.js >> /tmp/interact-api.log 2>&1 < /dev/null & disown`
  **Gotcha (I-04):** rodar o `setsid nohup … & disown` ISOLADO, em chamada bash própria — encadear com `&&` + `curl` no mesmo comando pode travar o shell até o timeout (o server sobe, mas o comando não retorna). Verificar a saúde em chamada separada.
- **Projects v2 (IDs GraphQL):** projeto #8 "Comunicação unidirecional" = `PVT_kwHOAS44y84Bh0oA` (funcional); #10 "Infra" = `PVT_kwHOAS44y84Bh1AC`. Campo `Status` do #8 = `PVTSSF_lAHOAS44y84Bh0oAzhgu8GM`, opções: Todo `f75ad846`, In progress `47fc9ee4`, Done `98236657`. Query de projetos do usuário: `gh api graphql` com `user(login:"OberdanBrito").projectsV2`. **Gotcha:** option ids numéricos (ex.: `98236657`) vão com `-f` (string bruta) — `-F` converte para número e quebra o coerce de `String!`. **Gotcha (token):** Projects v2 exige escopos `project`/`read:project`. O `gh` por padrão usa o token do **keyring** (`gh auth status`) — se ele for o OAuth `gho_` (escopos `gist/read:org/repo/workflow`), qualquer query/mutação de Projects v2 falha com `INSUFFICIENT_SCOPES`. O token completo é o **PAT `ghp_` em `GITHUB_API_TOKEN` no `.env`** (a `main`) — mas o `gh` **não lê `.env`**. Consertar: `GH_TOKEN=$(grep '^GITHUB_API_TOKEN=' .env | cut -d= -f2-)` prefixando o comando, OU refazer o auth uma vez: `echo "$GH_TOKEN" | gh auth login --with-token` (assim o keyring passa a ser o `ghp_` e o board funciona sem prefixar nada). Conferir com `gh auth status | grep -q 'project'`.
- **OpenSpec (CLI `/usr/local/bin/openspec`):** `openspec validate` usa `--changes` (NÃO `--change`); `openspec archive <nome>` é posicional e, quando o spec já foi sincronizado manualmente (skill `openspec-sync-specs`), rodar com `-y --skip-specs` (sem isso aborta com "ADDED failed … already exists").
- **Playwright MCP:** a bottom sheet é `<div>` (não `<dialog>`) — seletores `#sheet .js-*`; no QA pode já haver sessão ativa (form de login oculto) — conferir com snapshot antes de tentar logar. **Screenshot (I-04):** caminho absoluto fora das raízes permitidas é negado — salvar relativo (`.playwright-mcp/qa-*.png`) e `cp` para `/tmp/opencode/`.
- **QA de estado de leitura (I-11):** o snapshot de a11y não revela lido/não-lido — verificar via `browser_evaluate` no DOM (`unread-dot.hidden`) e no localStorage (`interact.user.<email>` → `read`). Após ações que disparam `renderFeed()` (re-render assíncrono), aguardar (~1s) antes de ler o DOM; fechar a sheet antes de clicar em filtros/chips (o backdrop intercepta pointer events).
- QA visual: MCPs `playwright` (`npx -y @playwright/mcp`) e `chrome-devtools` (`npx -y chrome-devtools-mcp@latest`), configurados no `opencode.json` global (`~/.config/opencode/opencode.json`, junto com `specdrive`).
- Usuário de QA do qa-pwa.mjs: admin@interactcorp.com.br (senha senha123); colaborador de QA: colaborador.operacoes@interactcorp.com.br (senha senha123).
