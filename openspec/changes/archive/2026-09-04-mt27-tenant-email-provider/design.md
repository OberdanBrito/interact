## Context

Ver `proposal.md` para motivação. Estado atual do backend:

- `Tenant.settings` é um campo `Mixed` (default `{}`) no model `Tenant.js` — pode receber a subestrutura `emailProvider` sem migração de schema.
- Middleware de tenant (`src/middleware/tenant.js`) resolve `req.tenant`/`req.tenantId` com precedência header → subdomínio → claim JWT (escopo estrito desde a MT-24).
- `auth` (`src/middleware/auth.js`) valida JWT e pertencimento ao tenant (`403` se `String(req.user.tenantId) !== String(req.tenantId)`); aplicado por rota via `router.use(auth)`.
- `requireAdmin` (`src/middleware/requireAdmin.js`) garante `req.user.role === "admin"`, senão `403`; usado por rota.
- `src/routes/index.js` monta os routers; `tenants.js` já usa `auth + requireAdmin` em `/api/tenants`.
- Não existe `src/crypto.js`; `ENCRYPTION_KEY` não está no `.env` de dev.

## Goals / Non-Goals

**Goals:**

- Persistir a config do provedor por tenant em `Tenant.settings.emailProvider` (sem quebra de schema — campo é `Mixed`).
- Cifrar/decifrar o segredo em repouso com AES-256-GCM via `src/crypto.js` (chave `ENCRYPTION_KEY` de env).
- Expor `GET` (mascarado), `PUT` (admin, auditoria) e `POST /test` (validação sem persistir/envio) escopados ao tenant.
- Manter o padrão de rotas do projeto (`auth` + `requireAdmin` por rota, escopo estrito via `req.tenantId`).

**Non-Goals:**

- Não implementar o envio de e-mail (isso é a I-08; este change apenas guarda a config consumível).
- Não decidir o provedor de e-mail (responsabilidade da issue #17 Infra).
- Não criptografar outros campos de `Tenant.settings` além de `secretEncrypted`.

## Decisions

### 1. Cifragem com `crypto` nativo (AES-256-GCM)

Usar `node:crypto` (`createCipheriv`/`createDecipheriv` com AES-256-GCM), sem lib externa — evita dependência nova e atende "cifrar o segredo em repouso". A chave vem de `process.env.ENCRYPTION_KEY`. Se ausente, o módulo de crypt lança erro na inicialização (fail-fast), pois sem a chave é inseguro operar com segredo em claro.

**Alternativas descartadas:** `bcrypt` (one-way, não serve para decifrar para o teste de conexão); lib externa de encryption (overkill, superfície de dependência maior).

### 2. Formato do segredo na resposta (mascarado)

Armazenar apenas o ciphertext (hex: `iv:tag:data`) em `secretEncrypted`. Na leitura, nunca decifrar para a resposta — retornar um placeholder mascarado (últimos 4 caracteres do `authUser`/secret quando já houver, ex.: `••••1234`). O endpoint `POST /test` decifra em memória para a validação e não ecoa o valor.

### 3. Novo endpoint dedicado para "test" sem persistir

`POST /api/tenant/settings/email-provider/test` recebe a config, **não grava** e apenas tenta a conexão. Para SMTP, uma tentativa de handshake (porta/host) sem envio real; para `api`, apenas valida que os campos obrigatórios estão presentes (o teste real de envio fica na I-08). Não enviar e-mail real é um requisito explícito.

### 4. RBAC e escopo

Todos os endpoints montados sob `router.use(auth)` + `requireAdmin` (papel admin do próprio tenant). Nenhum endpoint aceita `tenantId` via body/param — o tenant vem sempre de `req.tenantId` (injeção via middleware), garantindo que um admin só acessa o próprio tenant. `updatedBy` = `req.user.id`, `updatedAt` = timestamp.

### 5. Rotas sob `/api/tenant/settings/email-provider`

Montar `tenant-settings.js` em `/api/tenant` em `index.js`. O plural `/api/tenants` já existe (administra todos os tenants); o singular `/api/tenant` representa o tenant **da requisição** (self-service de config). Isso evita colidir com `/api/tenants` e mantém a semântica "meu tenant".

**Alternativa considerada:** aninhar em `/api/tenants/:id/settings` — descartado porque exigiria um admin "global" e fura o auto-isolamento por tenant (o admin só deve acessar o próprio).

## Risks / Trade-offs

- **`ENCRYPTION_KEY` ausente** → o módulo de crypt lança na inicialização (boot quebra em dev). Mitigação: documentar no `design` e no `.env.example`/`AGENTS.md`; o bootstrap fail-fast é intencional (melhor quegrav dados sem decifração possível).
- **Rotação da chave de cifragem** → sem suporte nesta fase. Mitigação: `secretEncrypted` guarda `iv` junto; rotação será uma migração futura (re-cifrar com a nova chave). Documentado como risco.
- **Vazamento acidental do ciphertext** → a API nunca devolve `secretEncrypted` nem o texto claro; apenas máscara. Mitigação: o `GET` não inclui `secretEncrypted` no payload (nem mascarado como campo real — só um placeholder de UI).
- **Teste `api` apenas valida campos** → pode dar falso positivo para credencial errada. Mitigação: registrar claramente no design/testes que para `type: api` a validação real de envio é da I-08; o teste desta fase é a checagem estrutural + (para smtp) handshake.

## Migration Plan

- Adicionar `ENCRYPTION_KEY` ao `.env` de dev (pré-requisito de boot).
- `Tenant.settings.emailProvider` é um objeto opcional dentro de `Mixed` — dados existentes seguem válidos (field não presente = config não definida → `GET` retorna vazio, `PUT` cria).
- Nenhuma migração de coleção. Rollback: remover a rota `/api/tenant` de `index.js` e os arquivos novos; dados de config já gravados não são lidos por rota nenhuma após o rollback.

## Open Questions

- Nenhuma. A decisão de "qual provedor" (issue #17 Infra) é externa a este change e não altera o shape da config (a config já suporta `type: smtp|api`).
