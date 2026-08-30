## 1. Dependência e infraestrutura de upload

- [x] 1.1 Adicionar `multer` ao `package.json` (`npm install multer`) e verificar que a instalação conclui sem erro.
- [x] 1.2 Garantir o diretório `uploads/` existente no boot (`server.js` ou `app.js` com `fs.mkdirSync(recursive)`) em modo seguro (try/catch) e adicionar `uploads/` ao `.gitignore`; verificar que a pasta é criada ao subir o servidor e não é rastreada pelo git.

## 2. Schema do comunicado — campo attachments

- [x] 2.1 Em `src/models/Comunicado.js`, adicionar `attachments: [{ id: String, name: String, type: String, size: Number, url: String }]` com `default: []`; verificar por `node --check` e por um boot/consulta que o campo aparece como `[]` em comunicados existentes.

## 3. Middleware de upload e limites

- [x] 3.1 Criar `src/upload.js` (ou equivalente) com estratégia `multer.diskStorage` (destino `uploads/`, nome de arquivo = `crypto.randomUUID()` + extensão segura), `limits.fileSize` = `MAX_ATTACHMENT_MB`, e `fileFilter` validando `ALLOWED_ATTACHMENT_TYPES`; verificar com um request multipart de teste que arquivo grande/tipo inválido são rejeitados e um válido é gravado em `uploads/`.
- [x] 3.2 Definir constantes `MAX_ATTACHMENT_MB` (default 10) e `ALLOWED_ATTACHMENT_TYPES` (default: `application/pdf`, `image/png`, `image/jpeg`, `image/gif`, `image/webp`) com `Number.parseInt`/set e fallback seguro; verificar que os valores default e env-override resolvem corretamente.

## 4. Endpoints de anexo em /api/posts/:id/attachments

- [x] 4.1 `POST /api/posts/:id/attachments` (requireAdmin): validar comunicado existente (404), usar `upload.single("file")` (com tratamento de erro multer → 400), salvar metadados em `attachments` e retornar 201 com os metadados; verificar via curl multipart que cria o anexo e retorna id/name/type/size/url.
- [x] 4.2 `GET /api/posts/:id/attachments/:attachmentId`: validar eligibilidade do comunicado com a MESMA regra de `GET /:id` (helper) → 404 se não elegível; 404 se anexo inexistente; servir binário do disco com `Content-Type` e `Content-Disposition: attachment; filename=...`; verificar que colaborador elegível baixa e não-elegível recebe 404.
- [x] 4.3 `DELETE /api/posts/:id/attachments/:attachmentId` (requireAdmin): remover metadado e apagar arquivo do disco (404 se anexo não existe); verificar que o anexo some do payload e o arquivo é removido.

## 5. Exposição no payload (toPost)

- [x] 5.1 Em `toPost` (src/routes/posts.js), adicionar `attachments: doc.attachments ?? []` garantindo nunca `null` e, junto com o `GET /:id`, verificar que o payload retorna `attachments: []` para comunicado sem anexo.
- [x] 5.2 Extrair helper de eligibilidade (`isPostEligible`) reutilizado por `GET /:id` e pelo GET de anexo; verificar que `GET /:id` continua com comportamento idêntico (sem regressão) após o refactor.

## 6. Tratamento de erro e remoção no delete do post

- [x] 6.1 No `DELETE /api/posts/:id`, apagar os arquivos dos anexos do comunicado antes de remover o doc; verificar que os binários são removidos do disco ao excluir o post.
- [x] 6.2 Garantir que erros multer (ex.: LIMIT_FILE_SIZE / tipos) retornem 400 com mensagem clara em português; verificar com upload de arquivo acima do limite e de tipo inválido.

## 7. Testes de integração

- [x] 7.1 Criar `scripts/qa-i03.mjs` (Mongo real) cobrindo: upload de anexo válido; `GET anexo` por colaborador elegível (200 com binário) e não-elegível (404); anexo inexistente (404); `attachments: []` para comunicado sem anexo; limite de tamanho (400) e tipo inválido (400); remoção de anexo; anexo em rascunho; excluir post remove binário.
- [x] 7.2 Registrar `qa:i03` no `package.json` e adicionar ao `test:integration`; verificar que `npm run test:integration` (Mongo real via docker) passa com os novos casos.
- [x] 7.3 Rodar `node --check` nos arquivos alterados e verificar que o servidor sobe sem erros (boot).
