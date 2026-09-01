# Tasks — MT-21: auth e login por tenant

## 1. Login e JWT por tenant

- [x] 1.1 Alterar `src/routes/auth.js` para buscar o usuário por `email + tenantId` com ponte de transição (`User.findOne({ email, $or: [{ tenantId: req.tenantId }, { tenantId: null }] })`), mantendo o `401 "Credenciais inválidas"` para e-mail não associado ao tenant resolvido. Verificar com `node --check src/routes/auth.js`.
- [x] 1.2 Incluir `tenantId` no `jwt.sign` (payload `{ id, email, name, role, tenantId }`, com `tenantId = req.tenantId ? String(req.tenantId) : null`) e no objeto `user` da resposta. Verificar que um token emitido decodificado contém `tenantId` igual ao tenant resolvido.
- [x] 1.3 Manter todos os testes de integration existentes passando sem mudança de fixture: os scripts `qa-i*.mjs` criam usuários com `tenantId: null` e `req.tenantId` é `null` quando nenhum header de tenant é enviado. Verificar rodando `npm run test:integration` (os scripts já existentes devem continuar ok).

## 2. Validação de pertencimento no auth.js

- [x] 2.1 Adicionar em `src/middleware/auth.js` (após definir `req.user`) a checagem `String(req.user.tenantId) !== String(req.tenantId)` → responder **403 `"Usuário não pertence a este tenant"`**. Verificar com `node --check src/middleware/auth.js`.
- [x] 2.2 Garantir que o caso `req.tenantId === null` (QA sem header) não bloqueia: com token e tenant ambos nulos a comparação passa. Verificar retornando 2xx em um request autenticado sem header de tenant.

## 3. QA de integração dedicado e wiring

- [x] 3.1 Criar `scripts/qa-i21.mjs` (conecta em `interact_test`, cria tenants A/B e usuários com `tenantId` explícito) cobrindo os 3 critérios:
  - JWT carrega `tenantId` do tenant resolvido;
  - login do mesmo e-mail no contexto do tenant errado → **401**;
  - request autenticado com token do tenant A em contexto B (via `X-Tenant-Slug: b`) → **403**.
  Verificar executando `node scripts/qa-i21.mjs` e conferindo `0 falhas`. (Resultado: 12 ok, 0 falhas.)
- [x] 3.2 Adicionar `node scripts/qa-i21.mjs` ao compilado `test:integration` em `package.json`. Verificar que `npm run test:integration` passa (qa-i21 + todos os anteriores) e `node --check scripts/qa-i21.mjs`.

## 4. Encerramento da esteira

- [x] 4.1 Rodar `npm run test:integration` completo com 0 falhas e registrar evidências (prints/asserts) no comentário de atividade da issue #21.
- [ ] 4.2 Após o archive da change, commit em `backend` (código + `openspec/`) com menção à MT-21 e push para `origin/backend`.
