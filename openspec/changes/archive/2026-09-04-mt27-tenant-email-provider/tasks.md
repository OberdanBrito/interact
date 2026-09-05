## 1. Cifragem do segredo

- [x] 1.1 Criar `src/crypto.js` com `encryptSecret(plain)` → `"iv:tag:data"` (hex) e `decryptSecret(value)` → texto, usando AES-256-GCM nativo; `ENCRYPTION_KEY` carregada de `.env` e fail-fast se ausente. Verificar com `node --check src/crypto.js` e um teste manual (encrypt → decrypt → round-trip igual).
- [x] 1.2 Adicionar `ENCRYPTION_KEY` ao `.env` (dev) e ao `.env.example`/docs. Verificar com `node -e "import('./src/crypto.js').then(m => console.log(m.encryptSecret('x')))"` sem erro.

## 2. Model e formato da config

- [x] 2.1 Em `src/models/Tenant.js`, documentar a subestrutura `settings.emailProvider` (sem alterar o tipo `Mixed`): `{ type, host, port, secure, authUser, secretEncrypted, fromAddress, fromName, updatedBy, updatedAt }`. Verificar com `node --check src/models/Tenant.js`.
- [x] 2.2 (Opcional) Criar helpers de normalização/validação da config (ex.: `src/utils/emailProvider.js`) para reuso nas rotas — validar `type` ∈ {smtp, api}, `host`/`port`/`fromAddress`/`fromName` obrigatórios. Verificar com `node --check`.

## 3. Rota tenant-settings

- [x] 3.1 Criar `src/routes/tenant-settings.js` com `GET /`, `PUT /` e `POST /test` (todas `router.use(auth)` + `requireAdmin` por rota), usando `req.tenantId` para buscar o `Tenant`. Verificar com `node --check`.
- [x] 3.2 Implementar `GET /` — retorna config com segredo mascarado (`••••` + últimos 4) e `updatedBy`/`updatedAt`; **nunca** retorna `secretEncrypted` nem texto claro. Verificar com teste manual via `curl` com token admin.
- [x] 3.3 Implementar `PUT /` — recebe config, cifra `secretEncrypted` via `crypto.js`, grava `updatedBy`/`updatedAt`, persiste em `Tenant.settings.emailProvider`. Verificar que o DB contém valor cifrado (via `mongosh`/log) e a resposta retorna mascarado.
- [x] 3.4 Implementar `POST /test` — recebe config, **não persiste**, valida credencial (SMTP: handshake; `api`: campos obrigatórios) e retorna sucesso/falha; nunca envia e-mail real. Verificar com `curl` sucesso + falha sem alterar `Tenant.settings`.

## 4. Montagem da rota

- [x] 4.1 Em `src/routes/index.js`, importar `tenantSettingsRouter` e montar em `router.use("/tenant", tenantSettingsRouter)`. Verificar com `node --check src/routes/index.js`.
- [x] 4.2 Subir o backend dev (`npm run dev` / `src/server.js`) e validar que `GET /api/tenant/settings/email-provider` responde (com token admin do tenant) e que uma rota inexistente sob `/api/tenant` dá 404.

## 5. Testes e validação

- [x] 5.1 Escrever `scripts/qa-mt27.mjs` cobrindo: `GET` vazio (sem config), `PUT` grava + `GET` mascarado + `updatedBy`/`updatedAt` (auditoria), `PUT` como não-admin → 403, `POST /test` sucesso/falha sem persistir, e escopo por tenant (tenant A não vê/alteria config de B). Verificar `node scripts/qa-mt27.mjs` → "PASS" (Mongo real).
- [x] 5.2 Adicionar `qa-mt27.mjs` ao script `test:integration` do `package.json`. Verificar `npm run test:integration` → exit 0 (suíte completa).
- [x] 5.3 Rodar `node --check` em todos os arquivos alterados (`src/crypto.js`, `src/routes/tenant-settings.js`, `src/routes/index.js`, `src/models/Tenant.js`, `scripts/qa-mt27.mjs`) → sem erros.
- [x] 5.4 Validar `openspec validate --change mt27-tenant-email-provider` → 1 passed.
