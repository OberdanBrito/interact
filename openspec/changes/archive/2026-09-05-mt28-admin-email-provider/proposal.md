## Why

O backend (MT-27) já permite que cada tenant configure seu provedor de e-mail em runtime. Sem uma tela no `frontend_admin`, essa configuração ainda dependeria de alguém mexer direto no banco/servidor — o problema que a MT-27 existe para resolver. Esta change entrega a interface para o gestor configurar o provedor do próprio tenant, consumindo a API da MT-27.

## What Changes

- Nova feature `features/settings/` no `frontend_admin` com uma tela de gestão do provedor de e-mail (`email-provider-view.js`), roteada em `#/settings/email-provider`.
- Formulário: tipo (`smtp`/`api`), host, porta, `secure` (toggle), usuário, segredo (**write-only** — placeholder `•••• (configurado)` quando já houver credencial salva), remetente (nome/e-mail).
- Botão **"Testar conexão"** (chama `POST .../test` da MT-27) antes de salvar, com feedback visual de sucesso/falha.
- Exibe **"última atualização por {nome} em {data}"** (auditoria `updatedBy`/`updatedAt`).
- Item de menu e rota **somente para `role: admin`** — demais roles não veem a entrada no menu e, se acessarem a rota, são redirecionados.

## Capabilities

### New Capabilities
- `gestao-email-provider-admin`: tela administrativa de gestão do provedor de e-mail por tenant. Cobre o formulário (com segredo write-only), o botão "Testar conexão" (sem salvar até validar/avisar), a exibição de auditoria (`updatedBy`/`updatedAt`) e a restrição de acesso a `role: admin` (menu oculto para não-admin).

### Modified Capabilities
- *(nenhuma — change novo no admin; a capability `sessao-admin` existente não muda de requisito.)*

## Impact

- **Código:** `frontend_admin/src/features/settings/email-provider-view.js` (novo), `frontend_admin/src/data/posts.js` (helper `getEmailProvider`/`updateEmailProvider`/`testEmailProvider` — ou um novo `data/email-provider.js`), `frontend_admin/src/app/router.js` (rota `#/settings/email-provider` + `AUTH_ROUTES`), `frontend_admin/src/ui/templates.js` (item de nav condicional a `role: admin`), `frontend_admin/index.html` (ícone do menu, se necessário).
- **API:** consome `GET/PUT /api/tenant/settings/email-provider` e `POST /api/tenant/settings/email-provider/test` (backend MT-27).
- **Dependências:** nenhuma nova.
