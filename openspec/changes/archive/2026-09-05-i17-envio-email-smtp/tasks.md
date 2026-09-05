# Tasks

## 1. Setup

- [x] 1.1 Adicionar `nodemailer` ao `package.json` e verificar instalação (`npm install nodemailer`) — espera-se `node_modules/nodemailer` presente e versão pinada em `dependencies`

## 2. Adaptador de envio (`src/utils/emailSender.js`)

- [x] 2.1 Implementar `createTransporter(provider, plainSecret)` retornando transporter nodemailer SMTP (host/port/secure/auth) com `from: { name: fromName, address: fromAddress }` — verificar via `node --check` e um teste unitário com `jsonTransport` (sem rede)
- [x] 2.2 Implementar `sendEmail({ to, subject, html, tenantId })` que resolve o tenant via `Tenant.findById`, monta config efetiva (decifra `secretEncrypted` via `decryptSecret`), e envia — verificar: dry-run sem config loga no console e retorna sucesso; `type: "api"` retorna erro claro "provedor API ainda não suportado"; produção sem config retorna erro
- [x] 2.3 Garantir que segredo decifrado nunca apareça em logs/erros (logar só host/usuário/erro SMTP sem `auth.pass`) — verificar por inspeção e teste com credencial inválida não expondo o segredo na mensagem de erro

## 3. Rota de teste com modo send

- [x] 3.1 Extrair helper `resolveProviderConfig(body, savedProvider)` reutilizável (body + segredo: body.secret se informado, senão `secretEncrypted` decifrado do tenant salvo) — verificar: `node --check` e uso consistente em `PUT` e `test`
- [x] 3.2 Adicionar suporte a `mode: "send"` no `POST /api/tenant/settings/email-provider/test`: valida `to` obrigatório (400 se ausente), chama `sendEmail` com assunto/corpo de teste identificáveis e retorna `{ ok: true, detail: "E-mail de teste enviado" }` — verificar via curl com SMTP fake (servidor local de teste) e via dry-run sem config
- [x] 3.3 Manter modo `connect` como default (sem `mode` no payload) com handshake atual — verificar que o comportamento da MT-27 não regrediu (curl no modo default)

## 4. QA de integração

- [x] 4.1 Criar `scripts/qa-i17.mjs` cobrindo: dry-run sem config (sucesso + log), `type: "api"` no envio (erro claro), `mode: "send"` sem `to` (400), `mode: "connect"` default (retrocompatível), config não persistida após teste — espera-se 0 falhas contra Mongo real
- [x] 4.2 Adicionar `qa-i17` ao `test:integration` no `package.json` e rodar a suíte completa — espera-se `EXIT 0` em todos os scripts
- [x] 4.3 Rodar `npm run build`/`node --check` nos arquivos alterados — espera-se sem erros de sintaxe

## 5. Validação OpenSpec

- [x] 5.1 Rodar `openspec validate --changes` — espera-se 1 change validada
- [x] 5.2 Rodar `openspec validate --specs` — espera-se todas as specs válidas (incluindo `email-envio` nova e `email-provider-tenant` modificada)