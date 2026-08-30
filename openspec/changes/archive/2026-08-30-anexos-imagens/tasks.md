## 1. Camada de dados — upload e remoção de anexo

- [x] 1.1 Em `src/data/posts.js`, adicionar `uploadAttachment(postId, file)` que envia `POST /api/posts/:id/attachments` com `FormData` (campo `file`) e `Authorization`; se não 2xx, lançar erro com a mensagem do backend; verificar via devtools/rede que o request é multipart com o arquivo.
- [x] 1.2 Adicionar `deleteAttachment(postId, attachmentId)` que envia `DELETE /api/posts/:id/attachments/:attachmentId`; verificar que retorna sucesso e o backend remove (200/204).
- [x] 1.3 Garantir que a função utilitária de `authHeaders()` não seja usada no upload (FormData não seta `Content-Type` manualmente — deixa o browser definir o boundary); verificar que o upload não envia `Content-Type: application/json`.

## 2. Formulário — campo "Anexos (opcional)"

- [x] 2.1 Em `src/features/posts/form-view.js`, adicionar o campo "Anexos (opcional)" após o corpo: input de arquivo (`type="file"`), lista dos anexos atuais (`post.attachments || []`) com nome, tipo/tamanho e botão "Remover"; verificar renderização com e sem anexos (comunidado sem anexo → vazio/"—", nunca `null`).
- [x] 2.2 Renderizar a lista de anexos usando um helper em `src/ui/templates.js` (ex.: `attachmentListHTML`) para consistência; verificar que o HTML escapa nome (sem XSS) e exibe tamanho formatado.

## 3. Validação do arquivo (tamanho/tipo)

- [x] 3.1 Adicionar validação do arquivo selecionado contra os limites do backend (tamanho máximo e tipos permitidos, espelhando as constantes) no handler de seleção/submit; exibir mensagem de erro clara via `showError`/`showToast`; verificar que arquivo grande/tipo inválido não segue para upload.
- [x] 3.2 Tratar erro de upload retornado pelo backend (400) exibindo a mensagem clara ao admin; verificar que um upload rejeitado pelo backend mostra o erro sem quebrar o formulário.

## 4. Fluxo de anexo em criação e edição

- [x] 4.1 No fluxo de **novo** comunicado: após `createPost` com sucesso (id obtido), chamar `uploadAttachment(id, file)` se houver arquivo selecionado; verificar via devtools que o arquivo é enviado após o CREATE e que o anexo aparece na listagem/detalhe.
- [x] 4.2 No fluxo de **edição**: chamar `uploadAttachment(postId, file)` no submit (após `updatePost`) se houver arquivo selecionado; verificar que o anexo é adicionado ao comunicado existente.
- [x] 4.3 No handler de **remover anexo**: chamar `deleteAttachment` e remover o item da lista local sem salvar o formulário; verificar que o anexo some da lista e do backend.
- [x] 4.4 Garantir que o estado de loading cobre a sequência (create → upload) e que um erro de upload não impede o usuário de ver o comunicado já criado; verificar comportamento com e sem anexo.

## 5. Verificação

- [x] 5.1 Rodar `npm run build` no frontend_admin e `node --check` nos arquivos alterados; confirmar build limpo.
- [x] 5.2 Validar visualmente (MCP chrome-devtools, admin :5174) o fluxo real: criar comunicado com anexo, editar com anexo, remover anexo, sem anexo (vazio/"—"); salvar screenshots em `/tmp/opencode/` e conferir que a UI não exibe `null`.
