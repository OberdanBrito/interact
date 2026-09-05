## Why

A MT-27 entregou a configuração do provedor de e-mail por tenant (cifrada, com RBAC e teste de conexão estrutural), mas **não há envio real**: nenhum e-mail é enviado pelo sistema. A issue #17 fecha essa lacuna com um **adaptador de envio único** (`sendEmail`) com implementação **SMTP genérico via nodemailer** (decisão do dono, 05/09/2026), consumido pela I-08 (e-mail fallback). Sem acoplamento: rotas/filas apenas chamam o adaptador; a config do tenant define o provedor.

## What Changes

- **Novo adaptador de envio único** `src/utils/emailSender.js`: `sendEmail({ to, subject, html, tenantId })` que resolve o provedor do tenant (`Tenant.settings.emailProvider`), decifra o segredo (`src/crypto.js`) e envia via SMTP (nodemailer).
- **Implementação SMTP genérico**: `type: "smtp"` → transporter nodemailer (host/port/secure/authUser/secret) com `from` = `fromName <fromAddress>`; `type: "api"` ainda **sem integração** (responde erro claro "provedor API ainda não suportado" — lista de suportados é decisão do dono).
- **Modo dry-run em dev**: sem provedor configurado no tenant → loga o e-mail no console (nunca tenta enviar), sem credencial real.
- **Teste de envio real**: o `POST /api/tenant/settings/email-provider/test` ganha modo `send` (payload `{ mode: "send", to }`) que envia um e-mail de teste real pelo adaptador (mantém o modo `connect` atual — handshake estrutural sem envio — como default, retrocompatível).
- **Dependência nova**: `nodemailer`.
- **Impacto no frontend_admin**: botão "Testar envio" na tela de provedor (já existente da MT-28) dispara o modo `send` com e-mail de destino informado.

## Capabilities

### New Capabilities
- `email-envio`: envio real de e-mail por tenant através de um adaptador único, com provedor SMTP genérico (nodemailer), segredo decifrado da config da MT-27, modo dry-run em dev e sem acoplamento no restante do código.

### Modified Capabilities
- `email-provider-tenant`: o requisito de teste evolui — o endpoint `POST /settings/email-provider/test` passa a aceitar modo `send` (envio real de e-mail de teste) além do modo `connect` atual (handshake estrutural, sem envio).

## Impact

- **backend**: `package.json` (+`nodemailer`), novo `src/utils/emailSender.js`, rota `src/routes/tenant-settings.js` (modo `send` no `POST /test`), testes QA (`scripts/qa-i17.mjs` no `test:integration`).
- **frontend_admin**: `src/data/email-provider.js` (`testEmailProvider` com `mode: "send"`), `src/features/settings/email-provider-view.js` (campo "E-mail de teste" + botão "Testar envio").
- **infra**: credenciais/segredos por tenant já cifrados no `Tenant.settings.emailProvider` (MT-27) — nunca commitados; dry-run cobre dev sem config.
- **Dependências**: `nodemailer` (runtime).
- **Nenhuma mudança breaking** no contrato público; modo `connect` continua default.