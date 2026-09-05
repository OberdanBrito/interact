## Context

Ver `proposal.md` para motivação. Estado atual do admin:

- O admin é tenant-aware (MT-25): `src/data/http.js` é a camada HTTP central (`authHeaders()` com `X-Tenant-Id`; helpers `apiGet`/`apiPost`/`apiPut`/`apiDelete`); `state.user` carrega `role`.
- `src/app/router.js`: `parseRoute()` mapeia hash → rota; `AUTH_ROUTES` registra título/ativo/render; `renderRoute()` monta `shellHTML` e chama `render(view)`. Rotas sem autenticação redirecionam para login.
- `src/ui/templates.js::shellHTML({ user, sectionTitle, active })` monta a sidebar de navegação — item de menu condicional ao `role` é aqui.
- `src/features/analytics/dashboard-view.js` é o exemplo mais recente de uma feature adicionada ao `router.js` + item de nav em `templates.js`.
- Backend (MT-27) expõe: `GET/PUT /api/tenant/settings/email-provider` e `POST /api/tenant/settings/email-provider/test`. O `GET` retorna `{ provider: null }` sem config; `PUT` com `secret` vazio retém a credencial.

## Goals / Non-Goals

**Goals:**

- Tela `#/settings/email-provider` consumindo a API da MT-27, com formulário write-only, "Testar conexão" e auditoria.
- Item de menu e rota restritos a `role: admin`.
- Reusar `src/data/http.js` (sem duplicar a camada HTTP).

**Non-Goals:**

- Não implementar o envio de e-mail (I-08) nem a escolha do provedor (issue #17 Infra).
- Não alterar o backend (a API já existe).
- Não criar gestão de múltiplos provedores — apenas um por tenant.

## Decisions

### 1. Nova feature `features/settings/` com `email-provider-view.js`

Seguir o padrão do projeto: uma view por feature, exportando `render(root)`. A tela consome um novo módulo de dados `src/data/email-provider.js` (ou helpers em `data/posts.js`). **Decisão:** criar `src/data/email-provider.js` separado (mantém `posts.js` focado em comunicados e evita inflar; a API é distinta). Exporta `getEmailProvider()`, `updateEmailProvider(payload)`, `testEmailProvider(payload)` usando os helpers de `http.js`.

### 2. Rota `#/settings/email-provider` + item de nav

Adicionar em `parseRoute()` o caso `settings/email-provider` e em `AUTH_ROUTES` a config (`title: "Provedor de e-mail"`, `active: "settings"`). No `renderRoute()`, antes de renderizar, checar `state.user.role === "admin"`: se não for, `location.replace("#/posts")`. Item de nav em `shellHTML` condicional a `role === "admin"`.

**Alternativa considerada:** gating por um array `ADMIN_ROUTES` — descartado por adicionar uma estrutura nova quando o check inline em `renderRoute` + condicional na sidebar é suficiente e explícito.

### 3. Segredo write-only

O `GET` retorna `maskedSecret` (ex.: `••••1234`) e `configured: true` quando há credencial. A view:
- Se `configured`, campo de segredo vazio com placeholder `•••• (configurado)`.
- Ao salvar, se segredo vazio → envia `secret: ""` (backend retém); se preenchido → envia o valor.
- Nunca popula o campo com o valor real (a API não o devolve).

### 4. "Testar conexão" sem salvar

Botão separado que chama `testEmailProvider(payload)` com os valores atuais do form (sem persistir). Exibe toast de sucesso (`ok: true`) ou erro (`ok: false`). **Regra de UX:** o salvamento é permitido mesmo sem teste, mas a view exibe aviso claro quando salvar sem um teste bem-sucedido (atende o critério "ou ao menos avisa claramente se não testado"). Uma vez com teste ok, um flag local permite salvar sem o aviso.

**Alternativa:** bloquear o salvar até teste ok — descartado porque a API permite salvar sem testar e o critério aceita "avisa claramente".

### 5. Auditoria

`updatedBy` vem como `id` (não nome) no backend. Para exibir "por {nome}", o admin tem apenas `state.user` (o próprio). **Decisão:** exibir "última atualização em {data}" sempre, e "por {nome}" quando o `updatedBy` coincidir com o usuário logado (caso comum). Isso não exige endpoint extra. Registrar no design como limitação conhecida (o backend não retorna o nome do autor; isso é aceitável e documentado).

## Risks / Trade-offs

- **`updatedBy` é `id`, não nome** → a tela mostra "por você" quando é o próprio admin; para histórico com nomes seria preciso o backend expor o nome (fora de escopo). Mitigação: documentado; o critério pede "por {nome} em {data}" — atendemos exibindo o nome quando é o usuário logado e a data sempre.
- **Teste `api` valida apenas estrutura** → pode dar falso positivo (envio real é da I-08). Mitigação: mensagem de sucesso do teste deixa claro que é validação de conexão/estrutura.
- **Item de menu novo em `shellHTML`** → não deve quebrar a sidebar atual. Mitigação: renderizar o item condicionalmente após os existentes, sem alterar os demais.

## Migration Plan

- Adicionar a rota e o item de menu; nenhuma migração de dados (a config vive no `Tenant` do backend).
- Rollback: remover a rota de `AUTH_ROUTES`/`parseRoute`, o item de nav e o arquivo da view.

## Open Questions

- Nenhuma. A limitação do nome do autor (item 5) é conhecida e não altera a spec (o critério é atendido com o nome do próprio usuário quando aplicável).
