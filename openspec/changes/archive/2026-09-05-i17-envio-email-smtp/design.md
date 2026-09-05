## Context

A MT-27 já entrega a configuração do provedor por tenant (`Tenant.settings.emailProvider`, segredo cifrado via `src/crypto.js`), as rotas `GET/PUT /api/tenant/settings/email-provider` (RBAC admin, write-only) e o `POST .../test` apenas no modo `connect` (handshake TCP sem envio). A MT-28 entregou a tela admin com "Testar conexão". A #17 adiciona o **envio real** através de um adaptador único consumível pela I-08. Ver `proposal.md` — Why.

## Goals / Non-Goals

**Goals:**
- Adaptador único `sendEmail({ to, subject, html, tenantId })` com implementação SMTP genérico via nodemailer, sem acoplamento no restante do código.
- Modo `send` no `POST /api/tenant/settings/email-provider/test` (e-mail de teste real), mantendo `connect` como default (retrocompatível).
- Modo dry-run em dev (sem provedor configurado → loga no console).
- Segredos sempre vindo da config cifrada do tenant (decifrados em memória), nunca de código/env versionado.

**Non-Goals:**
- Integração de provedores `type: "api"` (SendGrid/SES/Resend) — lista de suportados é decisão do dono; por ora responde erro claro.
- Fila de envio / retry / dead-letter (escopo da I-08).
- Templates de e-mail de comunicado (escopo da I-08).
- Migração do endpoint `test` — modo `connect` permanece default.

## Decisions

1. **Nodemailer como cliente SMTP.** É o padrão de fato em Node, maduro, com suporte a TLS/STARTTLS, autenticação e timeouts. Alternativas consideradas: implementação manual sobre `node:net` (já usada no handshake) — descartada por não cobrir STARTTLS/auth robusta; `smtp-connection` (baixo nível) — desnecessário. Nodemailer resolve `secure`/STARTTLS e `auth` de forma declarativa.

2. **`emailSender.js` com fábrica + função de alto nível.** `createTransporter(provider, plainSecret)` expõe o transporte para testes; `sendEmail({ to, subject, html, tenantId })` resolve o tenant, monta a config efetiva e envia. Isso permite QA do transporter isoladamente e reuso pela I-08 sem conhecer o provedor.

3. **Teste `send` usa a config do body + segredo salvo.** O endpoint de teste não persiste (igual ao modo `connect` atual). Para enviar de verdade, monta a config efetiva: campos do body + `secret` do body se informado, senão o `secretEncrypted` decifrado do tenant salvo. Extrair helper `resolveProviderConfig(body, savedProvider)` reutilizável entre `PUT` e `test`.

4. **Dry-run por ambiente.** Sem `Tenant.settings.emailProvider`: `NODE_ENV !== "production"` → loga destinatário/assunto/primeiras linhas do corpo no console e retorna sucesso; `NODE_ENV === "production"` → erro claro ("provedor de e-mail não configurado para o tenant"). Evita envio acidental em prod e vazamento de conteúdo sensível.

5. **`type: "api"` no envio → erro claro** (não tenta envio). O modo `connect` para `api` continua estrutural (retrocompatível com MT-27).

6. **Segredo decifrado nunca é logado.** O transporter usa o segredo em memória; erros de SMTP são logados sem incluir `auth.pass`.

## Risks / Trade-offs

- **[SMTP handshake ≠ envio completo]** Um host/porta acessível pode rejeitar autenticação → Mitigação: modo `send` valida o fluxo completo (auth + `MAIL FROM`/`RCPT TO`), expondo falha de credencial; modo `connect` continua como checagem rápida.
- **[Porta SMTP 25/587 bloqueada em dev/hosting]** Envios podem falhar por rede, não por config → Mitigação: erro SMTP claro do nodemailer + dry-run para dev sem provedor real.
- **[Nova dependência runtime]** `nodemailer` adiciona superfície de ataque → Mitigação: versão pinada no `package.json`; transporte usado apenas sob demanda, sem rede em boot.
- **[Provedor `api` não implementado]** Usuário pode configurar `type: "api"` e esperar envio → Mitigação: erro explícito no envio e aviso na tela (frontend) de que apenas SMTP está ativo.

## Migration Plan

- Sem migração de dados (config já cifrada da MT-27). Deploy: instalar `nodemailer`, subir backend, rodar `npm run test:integration` (novo `qa-i17` incluso). Rollback: reverter commit do adaptador — endpoint `test` mantém o modo `connect` nativo (não há dependência do `send`).

## Open Questions

- Nenhuma bloqueadora. O destinatário de teste no admin será um campo livre ("E-mail de teste") preenchido pelo admin; não há necessidade de armazenar último destinatário (decisão de UX delegada à implementação do frontend).