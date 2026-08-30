## 1. Model e payload

- [x] 1.1 Adicionar campo `expiresAt: { type: Date, default: null }` em `src/models/Comunicado.js` — verificar com `node --check`
- [x] 1.2 Expor `expiresAt` (ISO ou `null`) e `expired` derivado no `toPost` de `src/routes/posts.js` (`doc.expiresAt ?? null`; `expired = doc.expiresAt != null && new Date(doc.expiresAt).getTime() < Date.now()`) — verificar que o payload do GET expõe `expiresAt`/`expired`

## 2. Filtro de expirados no GET /api/posts

- [x] 2.1 Filtrar expirados no GET do colaborador (`req.user.role !== "admin"`): adicionar `$or: [{ expiresAt: null }, { expiresAt: { $gte: now } }]` no array `and`, valendo com e sem `?archive` — verificar que expirado some do feed (sem archive e com `archive=archived`)
- [x] 2.2 Garantir que o admin NÃO é filtrado (filtro restrito a `req.user.role !== "admin"`) — verificar que o admin continua vendo o expirado que publicou

## 3. Elegibilidade no GET /api/posts/:id

- [x] 3.1 No GET `/:id`, tornar expirado não-elegível para colaborador (condição inclui `!(doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now())`) → `404` — verificar que colaborador recebe 404 em expirado e admin continua acessando

## 4. POST/PUT aceitam expiresAt

- [x] 4.1 No `POST /api/posts`, incluir `expiresAt` no destructuring; se presente e não vazio: formato inválido → `400`; válido → `doc.expiresAt = new Date(...)` (passado = expiração imediata, aceito); ausente/vazio → `null`. Nunca bloqueia rascunho/publicar/agendar — verificar POST com/sem `expiresAt`
- [x] 4.2 No `PUT /api/posts/:id`, se `expiresAt !== undefined`: vazio/`null` → `doc.expiresAt = null` (reativa mantendo estado atual); data válida → define; inválida → `400`. Sem interação com `publishAt`/`draft`/`status` — verificar que reativar expirado publicado mantém `status: "publicado"` e `expired: false`

## 5. Teste de integração versionado (portão Fase 4)

- [x] 5.1 Criar `scripts/qa-i05.mjs` cobrindo: payload expõe `expiresAt`/`expired` (default null/false); colaborador não vê expirado (sem archive e com `archive=archived`); GET `/:id` de expirado → 404 para colaborador; admin vê expirado com `expired: true`; reativação via `PUT { expiresAt: "" }` limpa e mantém publicado; `expiresAt` inválido → 400 — 100% de passagem contra o MongoDB real (docker)
- [x] 5.2 Adicionar script `qa:i05` no `package.json` e incluí-lo no `test:integration`
- [x] 5.3 Rodar `npm run qa:i05` com 100% de passagem
- [x] 5.4 Rodar `node --check` nos arquivos alterados

## 6. QA visual (portão Fase 5 — a executar no apply)

- [x] 6.1 Validar no Playwright :5173 (colaborador) que comunicado expirado não aparece no feed, nem na aba "Arquivo"; validar no admin :5174 (via change da componente frontend_admin) que o expirado aparece com selo "Expirado"