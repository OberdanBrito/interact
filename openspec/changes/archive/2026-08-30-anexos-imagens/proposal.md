## Why

Hoje o comunicado suporta apenas texto (título, corpo, categoria, autor). O admin não consegue
anexar documentos (ex.: PDF) nem imagens ao comunicado, limitando a comunicação interna a texto.
A I-03 permite anexar arquivos/imagens a um comunicado, com armazenamento local (multer) no
backend e visualização/download no PWA, respeitando a mesma visibilidade do comunicado e limites
de tamanho/tipo.

## What Changes

- **Backend** — `Comunicado` ganha campo `attachments: [{ id, name, type, size, url }]`
  (metadados; o binário fica em disco sob `uploads/`):
  - `POST /api/posts/:id/attachments` (multipart via multer, somente admin) grava um anexo e
    retorna seus metadados; `DELETE /api/posts/:id/attachments/:attachmentId` remove um anexo.
  - `GET /api/posts/:id/attachments/:attachmentId` serve o binário do anexo **respeitando a
    MESMA visibilidade do comunicado** (não elegível → 404, igual a `GET /:id`); sem anexo →
    metadados vazios (`attachments: []`).
  - Limites (tamanho máximo e tipos permitidos) definidos por constantes/`process.env` no backend;
    excesso → 400 com mensagem clara.
- **`GET /api/posts/:id`** passa a devolver `attachments` (metadados) no payload do comunicado.
- `toPost` expõe `attachments` (nunca `null`; comunicado sem anexo → `[]`).

## Capabilities

### New Capabilities
<!-- Nenhuma capability nova; o comportamento da API de comunicados é estendido. -->

### Modified Capabilities
- `comunicados`: o comunicado passa a suportar anexos (arquivos/imagens). São adicionados
  `attachments` (metadados) no model e no payload de resposta; endpoints de upload (`POST`),
  remoção (`DELETE`) e servir binário (`GET`) — todos respeitando a visibilidade do comunicado
  e os limites de tamanho/tipo definidos no backend.

## Impact

- **Backend**: `src/models/Comunicado.js` (campo `attachments`), `src/routes/posts.js`
  (novos endpoints de upload/remoção/serve + exposição no payload), novo middleware/fluxo multer
  (upload em `src/upload.js` ou inline), `src/server.js` (garantir diretório `uploads/`),
  `package.json` (dependência `multer`).
- **Dependência nova**: `multer` (upload multipart).
- **Sem mudança de schema de dados existente**: `attachments` é aditivo; comunicados antigos
  ficam com `attachments: []`.
- **Fora de escopo**: armazenamento em bucket externo (S3/etc.); prévia de imagem em rich-text;
  anexo em comunicados arquivados como comportamento distinto do padrão.
