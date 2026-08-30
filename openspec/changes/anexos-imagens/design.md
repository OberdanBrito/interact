## Context

Veja `proposal.md` — Why. O formulário de comunicado (`src/features/posts/form-view.js`) hoje
monta um objeto JSON e envia via `createPost`/`updatePost` (`src/data/posts.js`), que usam
`fetch` com `Content-Type: application/json`. Não há suporte multipart/form-data nem conceito de
anexo. O payload do comunicado passa a conter `attachments: [{ id, name, type, size, url }]`
(contrato do backend I-03).

## Goals / Non-Goals

**Goals:**
- Adicionar campo "Anexos (opcional)" ao formulário: seleção de arquivo, lista com nome/tipo/
  tamanho, e remoção.
- Enviar o arquivo ao backend no momento certo (após criar o post em "novo"; direto em edição).
- Erro claro para limites (tamanho/tipo), sem publicar; nunca exibir `null` na UI.

**Non-Goals:**
- Preview inline do conteúdo; edição de metadados; múltiplos arquivos num único submit;
  ordenação/reordenação de anexos.

## Decisions

### D1 — Upload do arquivo via FormData em um endpoint dedicado, não no payload JSON
Decisão: o formulário segue enviando o comunicado em JSON (sem mudar o fluxo atual). O arquivo é
submetido separadamente com `FormData` para `POST /api/posts/:id/attachments`. Para **novo**
comunicado, o fluxo é: `createPost(data)` → obter `id` → `uploadAttachment(id, file)` (se houver
arquivo). Para **edição**, `uploadAttachment(postId, file)` diretamente (não depende do PUT).
Alternativa descartada: `multipart/form-data` no `createPost` — acopla tudo num único request,
complica o backend e não converge com o contrato `POST /:id/attachments` (que exige o post já
criado).

### D2 — Upload assíncrono pós-criação e pós-salvamento na edição
Decisão: no "novo", o arquivo é enviado **depois** de o post existir (id gerado pelo backend). Se
o upload falhar (não há post criado sem erro), exibir erro claro; o comunicado já criado sem anexo
permanece válido. Na edição, o upload acontece após o `updatePost` (ou em paralelo), já que o
`id` existe. Descartado: anexar antes do POST (o backend exige id) e criar "upload pendente"
client-side (mais estado, sem ganho).

### D3 — Lista de anexos lida do payload do post, remoção por DELETE
Decisão: os anexos já vêm no comunicado (`attachments`). A UI renderiza a lista a partir de
`post.attachments` (ou `[]`). Remover → `deleteAttachment(postId, attachmentId)` → atualizar a
lista local removendo o item. NUNCA renderizar `null`/`undefined` — uso de `(post.attachments ||
[])`. Descartado: endpoint dedicado de metadados (só adicionaria ida extra ao servidor).

### D4 — Validação espelhada + erro claro (limites do backend são fonte de verdade)
Decisão: o admin valida o arquivo (tamanho e tipo) com as mesmas constantes/política definidas no
backend antes de submeter (UX imediata), mas o backend permanece a fonte de verdade — erros 400 do
backend são exibidos com mensagem clara. Descartado: confiar só no backend (pior UX) ou só no
cliente (segurança).

## Risks / Trade-offs

- **[Falha no upload após criar o post]** → O comunicado é criado sem anexo (comportamento válido);
  erro exibido e o admin pode reanexar. Não há estado intermediário que corrompa o post.
- **[Divergência de limites admin↔backend]** → Mitigação: espelhar constantes no admin e tratar
  qualquer 400 do backend como mensagem clara (fonte de verdade é o backend). Documentar no spec.
- **[Re-render perde arquivo selecionado]** → Mitigação: manter o arquivo em estado local até o
  submit; remover da lista de arquivos só após sucesso.
- **[`null` na UI]** → Uso sistemático de `(post.attachments || [])`; validação visual na Fase 5.

## Migration Plan

- Sem migração de dados. Rollback: remover o campo do formulário e as funções
  `uploadAttachment`/`deleteAttachment` (o comunicado sem anexo continua válido).

## Open Questions

- Nenhuma. O fluxo de anexo em "novo" ser pós-criação é a única forma coerente com o contrato do
  backend (`POST /:id/attachments`); assumido e registrado.
