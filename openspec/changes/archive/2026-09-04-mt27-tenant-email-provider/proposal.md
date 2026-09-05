## Why

Cada tenant precisa configurar seu próprio provedor de envio de e-mail (SMTP ou API de terceiro) sem depender de um `.env` fixo por deploy. Hoje a configuração é por variável de ambiente global, o que força a plataforma a colidir no mesmo provedor para todos os clientes e impede gerenciamento em runtime. A configuração deve viver em banco, ser gerenciada em runtime e ter controle de acesso (RBAC), com o segredo do provedor **cifrado em repouso** — nunca em texto puro.

## What Changes

- Estender `Tenant.settings` com `emailProvider`: `{ type: 'smtp'|'api', host, port, secure, authUser, secretEncrypted, fromAddress, fromName, updatedBy, updatedAt }`.
- Novo `src/crypto.js` para **cifragem/decifragem** do segredo em repouso (AES-256-GCM, chave `ENCRYPTION_KEY` de ambiente). A chave de cifragem pode ficar em env; o segredo do provedor não.
- Nova rota `src/routes/tenant-settings.js` (montada em `/api/tenant/settings/email-provider`):
  - `GET /` — retorna a config com segredo **mascarado** (ex.: `••••1234`), nunca em texto puro.
  - `PUT /` — atualiza a config; **`role: admin` obrigatório** (reusa `requireAdmin`); grava `updatedBy`/`updatedAt`.
  - `POST /test` — valida a credencial (conexão de teste) **sem persiste** e **sem enviar e-mail real**.
- Registrar a rota no `src/routes/index.js` (`/api/tenant`).
- Todos os endpoints escopados pelo tenant resolvido (`req.tenantId`) — um tenant só vê/altera o próprio provedor.

## Capabilities

### New Capabilities
- `email-provider-tenant`: configuração do provedor de e-mail por tenant (armazenamento no `Tenant.settings`, API e RBAC). Cobre o `GET` (mascarado), `PUT` (admin, auditoria `updatedBy`/`updatedAt`), `POST /test` (validação sem persistir/envio) e a exigência de que o segredo nunca trafega/persiste em texto puro.

### Modified Capabilities
- *(nenhuma — este change é ponta a ponta no backend; o consumo pela I-08 será uma modificação futura da capability de notificações, quando o e-mail fallback for implementado no backend. Nenhuma spec existente muda de requisito aqui.)*

## Impact

- **Código:** `backend/src/models/Tenant.js` (shape de `settings.emailProvider`), `backend/src/crypto.js` (novo), `backend/src/routes/tenant-settings.js` (nova), `backend/src/routes/index.js` (montagem `/api/tenant`).
- **API:** novos endpoints `GET/PUT /api/tenant/settings/email-provider` e `POST /api/tenant/settings/email-provider/test`, todos atrás de `auth` + `requireAdmin`.
- **Dependências:** nenhuma nova lib — cifragem via `crypto` nativo do Node.
- **Ambiente:** nova variável `ENCRYPTION_KEY` (chave de cifragem do segredo); `.env` de dev precisará dela (a senha/API key do provedor passa a ser dado por tenant, não por env).
