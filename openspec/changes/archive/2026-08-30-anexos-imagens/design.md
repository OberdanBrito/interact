## Context

Veja `proposal.md` — Why. O backend (Express 5 + Mongoose, `/api/posts`) hoje só manipula texto:
`Comunicado` (model) guarda `title`, `body`, `author`, `targetGroups`, `readMode`, `dateISO`,
`published/draft/publishAt` (agendamento I-01, rascunho I-02), `pinned` (I-04), `expiresAt`
(I-05). Não há upload nem storage de binário; `package.json` não tem `multer`. `app.js` monta
`/api` → `routes/index.js` → `routes/posts.js` (CRUD completo) e um catch-all 404.

## Goals / Non-Goals

**Goals:**
- Adicionar anexos (arquivos + imagens) a um comunicado, com metadados no payload e binário em
  disco local (multer) — sem bucket externo.
- Servir o binário com a **mesma visibilidade do comunicado** (404 para não-elegível, nunca 403/200).
- Limitar tamanho/tipo no backend, com erro claro (400), e nunca expor `null`(`attachments: []`).

**Non-Goals:**
- Bucket externo/S3; prévia de imagem inline no corpo; múltiplos uploads em um único request;
  anexo em comunicado arquivado com comportamento diferenciado do padrão.
- Não alterar a imutabilidade do alvo: `attachments` não é "alvo" e não entra na regra de
  imutabilidade pós-publicação; o anexo pode ser adicionado/removido após publicar (é conteúdo,
  não público-alvo). Reavaliar se isso conflitar com decisões futuras.

## Decisions

### D1 — Armazenamento local via multer, metadados no Comunicado
Decisão: usar `multer` (diskStorage) em `src/upload.js` para gravar o binário em `./uploads/`
(fora da pasta de código, gitignorado). O `Comunicado` ganha `attachments: [{ id, name, type,
size, url }]` — metadados apenas (o binário fica referenciado por `id`). `url` é a rota canônica
`/api/posts/:id/attachments/:attachmentId`.
Alternativas: (a) bucket externo — descartado por esforço/escopo (I-03 é "local via multer ou
bucket", escolhido local); (b) gravar binário em GridFS — descartado por adicionar complexidade
de leitura no Mongo sem ganho para este porte; (c) `express.static` de `uploads/` — **descartado**
porque não aplica a visibilidade do comunicado (vazamento para não-alvo).

### D2 — Endpoints dentro de `/api/posts/:id/attachments` (não `/:id/upload`)
Decisão: colocar upload/servir/remover anexo sob `/api/posts/:id/attachments[/:attachmentId]`,
herdando o controle de visibilidade/ownership já existente em `posts.js`. `POST` e `DELETE` usam
`requireAdmin`; `GET` usa a regra de visibilidade de `GET /:id` (não-elegível → 404, coerente com
a convenção "não revela existência").

### D3 — Limites via constantes/env no backend + validação no admin
Decisão: constantes `MAX_ATTACHMENT_MB` (default 10) e lista `ALLOWED_ATTACHMENT_TYPES` (default:
`application/pdf`, `image/png`, `image/jpeg`, `image/gif`, `image/webp`) lidas de `process.env`
com `Number.parseInt`/cup. `multer` usa `limits.fileSize`. Upload rejeitado → 400 com mensagem
portuguesa clara (também validado no admin para boa UX). Descartado: validação só no cliente (o
backend é fonte de verdade) e só de tamanho (tipos também são limites do produto).

### D4 — Identidade do anexo = uuid, nome original preservado
Decisão: `attachmentId` gerado (`crypto.randomUUID()`) como nome de arquivo em disco (evita colisão
e path traversal); o `name` exibido é o `originalname` do upload (sanitizado/limitado em
comprimento). `Content-Disposition` no GET define download. Descartado: usar `originalname` na
rota/arquivo (risco de colisão/injeção de path).

## Risks / Trade-offs

- **[Binário em disco não sincronizado com banco]** → Reconciliável: o binário só é servido se
  existir metadado em `attachments`; ao `DELETE`, apagar arquivo e metadado. Upload órfão (se o
  request falhar após gravar) → mitigável apagando em erro; não há fila de limpeza (aceito como
  caso raro).
- **[Visibilidade duplicada entre `GET /:id` e `GET anexo`]** → Mitigação: extrair helper de
  eligibilidade (`isPostEligible(doc, user)`) usado por `GET /:id` e pelos anexos, evitando drift.
- **[Sem limpeza de órfãos em disco]** → Aceito no escopo; arquivos só são apagados via `DELETE`
  e no `DELETE /api/posts/:id` (apagar anexos do post). Risco de espaço é pequeno (limite por
  arquivo); documentado.
- **[MIME confiável no multer]** → `multer` usa `fileFilter` + `mimetype` do cliente; é uma
  heurística. Mitigação: limitar por extensão + mimetype e nunca servir direto como HTML
  (Content-Disposition attachment) — mantém escopo simples.

## Migration Plan

- Sem migração de dados: `attachments` é aditivo (comunicados antigos → `[]`). Adicionar
  `.gitignore` para `uploads/`. Criar `uploads/` no boot (`server.js`/`app.js`) com
  `fs.mkdirSync(recursive)`. Rollback: remover dependência `multer` e os endpoints; binário
  existente é ignorado (nunca referenciado por metadado ausente).

## Open Questions

- Nenhuma. A escolha "local via multer" (vs bucket) e os limites padrão foram assumidos como
  perfil de produto; ajustáveis via env sem mudar spec.
