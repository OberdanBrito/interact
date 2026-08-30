# INTERACT - BASE DE CONHECIMENTO DO SISTEMA

## OVERVIEW
Interact: plataforma de comunicação interna entre empresa e colaboradores.
Stack: Node.js + Express 5 + MongoDB (Mongoose) + JWT no backend; Vite vanilla JS nos dois frontends.

## FUNCIONALIDADE ÚNICA (LEIA PRIMEIRO)
A funcionalidade principal do produto é **comunicação unidirecional: empresa → colaborador**.
A empresa publica comunicados; colaboradores leem. Nada mais. **Exceção parcial:** interações de leitura e curtida do colaborador agora sincronizam de volta ao backend (bidirecional), para o admin ver métricas — mas não há conteúdo enviado pelo colaborador nem conversa.

O que existe:
- Admin autenticado cria/edita/remove comunicados (com categorias, **grupos-alvo** e modo de leitura). Pode salvar **rascunho** (`status: "draft"`, campo `draft: true` no model) com campos incompletos — só o admin que o criou vê; publicar rascunho exige título, categoria, autor e conteúdo.
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
projeto; o código vive em **branches vivas por componente**, extraídas como
worktrees dentro de `/home/oberdan/WebstormProjects/interact/`:

```
interact/                      (main – docs: AGENTS.md, ISSUES.md, README.md)
├── backend/           branch viva `backend`      API REST + MongoDB (Express 5, Mongoose, JWT)
├── frontend_admin/    branch viva `frontend_admin`  painel administrativo (Vite vanilla JS)
└── frontend_pwa/      branch viva `frontend_pwa`    PWA do colaborador (Vite + vite-plugin-pwa)
```

Cada worktree está na sua branch viva com tracking de `origin/<branch>` (não é
detached HEAD). Commits de todas as issues acumulam na branch da componente; o
`.git` da `main` lista `?? backend/` etc. como não-rastreadas — é esperado.
`/home/oberdan/projetos/interact/` é duplicata antiga do frontend_pwa. NÃO usar.

## COMPONENTES

### backend/
API REST + MongoDB. Express 5, Mongoose, JWT, bcrypt, CORS.
- Porta padrão 3001; roda em 3002 via env `PORT`.
- Rotas: `/api/auth/login`, `/api/posts` (CRUD completo), `/api/categories`, `/api/groups`, `/api/interactions`.
- Models: `Comunicado`, `User`, `Group`, `Interaction`. Middleware de auth JWT.
- Scripts: `dev` (node --watch src/server.js), `start`, `seed`, `db:reset` (docker compose down -v && up -d && seed).
- MongoDB sobe via docker-compose.

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
> (`~/.config/opencode/skills/esteira-implementacao/SKILL.md`). Requisito gravado também em todas
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
- **Segmentação**: `targetGroups: []` = broadcast; preenchido = exclusivo (união). `targetGroups`/`groupIds` guardam `Group._id` como string. Alvo imutável APÓS publicação (400 no PUT); rascunho/agendado (`published === false`) ainda pode editá-lo.
- **Rascunhos (I-02)**: estado derivado no model — `draft === true` ⇒ `published: false` e `publishAt: null`; `toPost` reporta `status: "rascunho"`. `title`/`categoryId` não são mais `required` no schema (defaults `""`/`"geral"`); a obrigatoriedade é validada na rota apenas para não-rascunho. Publicar rascunho (`status: "published"` no PUT) exige título, categoria, autor (nome) e corpo não vazio (valores efetivos payload|doc). Rascunho invisível ao colaborador (filtro `published: true` no GET).
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
| backend | `npm run dev` | - | `npm run seed`, `npm run db:reset` |
| frontend_admin | `npm run dev` (:5174) | `npm run build` | sem testes |
| frontend_pwa | `npm run dev` (:5173) | `npm run build` | `npm run qa`, scripts E2E |

## NOTAS
- Ambiente dev local: backend :3002 (env `PORT`, log `/tmp/interact-api.log`), PWA :5173 (`/tmp/interact-pwa.log`), admin :5174 (`/tmp/interact-admin.log`); dev servers via `npm run dev -- --port <X> --strictPort`.
- **Backend dev:** `npm run dev` usa `node --watch`; se subir com `npm run start` (sem watch), **reiniciar após mudanças** (o QA visual roda contra o código carregado). Comando para subir destacado do shell (não morre com o fim do comando):
  `cd interact/backend && setsid nohup env PORT=3002 node src/server.js >> /tmp/interact-api.log 2>&1 < /dev/null & disown`
  **Gotcha (I-04):** rodar o `setsid nohup … & disown` ISOLADO, em chamada bash própria — encadear com `&&` + `curl` no mesmo comando pode travar o shell até o timeout (o server sobe, mas o comando não retorna). Verificar a saúde em chamada separada.
- **Projects v2 (IDs GraphQL):** projeto #8 "Comunicação unidirecional" = `PVT_kwHOAS44y84Bh0oA` (funcional); #10 "Infra" = `PVT_kwHOAS44y84Bh1AC`. Campo `Status` do #8 = `PVTSSF_lAHOAS44y84Bh0oAzhgu8GM`, opções: Todo `f75ad846`, In progress `47fc9ee4`, Done `98236657`. Query de projetos do usuário: `gh api graphql` com `user(login:"OberdanBrito").projectsV2`. **Gotcha:** option ids numéricos (ex.: `98236657`) vão com `-f` (string bruta) — `-F` converte para número e quebra o coerce de `String!`.
- **OpenSpec (CLI `/usr/local/bin/openspec`):** `openspec validate` usa `--changes` (NÃO `--change`); `openspec archive <nome>` é posicional e, quando o spec já foi sincronizado manualmente (skill `openspec-sync-specs`), rodar com `-y --skip-specs` (sem isso aborta com "ADDED failed … already exists").
- **Playwright MCP:** a bottom sheet é `<div>` (não `<dialog>`) — seletores `#sheet .js-*`; no QA pode já haver sessão ativa (form de login oculto) — conferir com snapshot antes de tentar logar. **Screenshot (I-04):** caminho absoluto fora das raízes permitidas é negado — salvar relativo (`.playwright-mcp/qa-*.png`) e `cp` para `/tmp/opencode/`.
- **QA de estado de leitura (I-11):** o snapshot de a11y não revela lido/não-lido — verificar via `browser_evaluate` no DOM (`unread-dot.hidden`) e no localStorage (`interact.user.<email>` → `read`). Após ações que disparam `renderFeed()` (re-render assíncrono), aguardar (~1s) antes de ler o DOM; fechar a sheet antes de clicar em filtros/chips (o backdrop intercepta pointer events).
- QA visual: MCP `playwright` (`/usr/local/bin/playwright-mcp`, browser chromium no cache ms-playwright) e MCP `chrome-devtools` (`npx chrome-devtools-mcp@latest`, usa google-chrome do sistema), configurados no `opencode.json` global.
- Usuário de QA do qa-pwa.mjs: admin@interactcorp.com.br (senha senha123); colaborador de QA: colaborador.operacoes@interactcorp.com.br (senha senha123).
- `/home/oberdan/projetos/interact/` é duplicata antiga do frontend_pwa. NÃO editar, NÃO usar como raiz.
