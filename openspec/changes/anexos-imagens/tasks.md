## 1. Helper de renderização da lista de anexos

- [x] 1.1 Em `src/features/feed/templates.js`, criar `attachmentsListHTML(attachments, postId)` que recebe `post.attachments ?? []` e devolve uma lista `<ul class="attachment-list">` com cada anexo (nome, tipo/tamanho, link para `getAttachmentUrl`); verificar que escapa nome (sem XSS) e que lista vazia retorna `""` (nunca "null").

## 2. Exibição dos anexos no bottom sheet (detalhe)

- [x] 2.1 Em `index.html`, adicionar um container `#sheet-attachments` dentro de `.sheet-body` (após `.sheet-text`, antes de `.sheet-transparency`); verificar que o container existe no DOM.
- [x] 2.2 Em `src/ui/sheet.js` (`openSheet`), preencher `#sheet-attachments` com `attachmentsListHTML(post.attachments, postId)`; se vazio, ocultar o container; verificar que comunicado sem anexo não exibe `null` e que com anexo exibe a lista.

## 3. URL do anexo e download autenticado

- [x] 3.1 Adicionar `getAttachmentUrl(postId, attachmentId)` em `src/data/posts.js` retornando a URL canônica (`API_BASE + /api/posts/:id/attachments/:attachmentId`) para uso de downloads/links; verificar a string gerada.
- [x] 3.2 Implementar o download/visualização do anexo: o clique no link de um anexo faz `fetch` autenticado (header JWT) → blob → download (`createObjectURL`) sem pôr o token na URL; em caso de erro 401/404/fora de rede, exibir toast amigável (sem quebrar o app); verificar via devtools/rede que o request leva o Authorization e que um anexo de post não-elegível é bloqueado (404).

## 4. Cache offline — metadados de anexo

- [x] 4.1 Confirmar que `src/data/cache.js` segue persistindo o campo `attachments` (metadados serializáveis) via `bulkPut` sem bump de versão nem query extra; verificar que um comunicado com anexos é lido offline a partir do cache sem erro e que o texto continua renderizando.
- [x] 4.2 Garantir que, offline, a lista de anexos é renderizada a partir dos metadados cacheados (sem binário) e que tentar baixar sem rede é um no-op gracioso (toast, sem erro não tratado); verificar no modo offline (devtools emulação).

## 5. Estilo e verificação

- [x] 5.1 Adicionar estilo dos anexos em `styles.css` (lista, link destacado, indicador de arquivo) coerente com o design system existente; verificar visualmente no detalhe.
- [x] 5.2 Rodar `npm run build` no frontend_pwa e `node --check` nos arquivos alterados; confirmar build limpo.
- [x] 5.3 Validar visualmente (MCP playwright, PWA :5173) o fluxo real: abrir comunicado com anexo (lista + download), sem anexo (ausência limpa), offline com anexos; salvar screenshots em `/tmp/opencode/` e conferir que não exibe `null`.
