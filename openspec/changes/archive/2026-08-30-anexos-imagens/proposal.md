## Why

Hoje o formulário de comunicado do admin só aceita título, categoria, prioridade, modo de
leitura, grupos-alvo, agendamento, validade, autor e corpo. O admin não consegue anexar arquivos
(ex.: PDF) nem imagens a um comunicado, apesar de a comunicação interna frequentemente depender
deles. A I-03 adiciona o campo "Anexos" ao formulário, com upload de arquivo, lista dos anexos
anexados (nome, tipo, tamanho) e remoção, refletindo os metadados devolvidos pelo backend.

## What Changes

- **frontend_admin** — o formulário de comunicado (`form-view.js`) ganha um campo "Anexos
  (opcional)":
  - input de arquivo para o admin selecionar um arquivo/imagem;
  - lista dos anexos já anexados ao comunicado, com nome, tipo/tamanho e ação de remover;
  - no **novo** comunicado, o anexo é enviado ao backend **após** a criação do post (o backend
    exige `:id`); na **edição**, enviado diretamente a `/api/posts/:id/attachments`;
  - erro claro em caso de tamanho/tipo inválido (validado também no backend — fonte de verdade);
  - comunicado sem anexo exibe o campo vazio/"—" (nunca `null`).
- **data/posts.js** — novas funções para upload (`uploadAttachment(postId, file)`), listagem de
  anexos (já vem no post) e remoção (`deleteAttachment(postId, attachmentId)`).

## Capabilities

### New Capabilities
<!-- Nenhuma capability nova; a gestão de comunicados no admin é estendida. -->

### Modified Capabilities
- `posts`: o formulário de comunicado passa a suportar anexos (arquivos/imagens) — campo de
  upload, lista e remoção de anexos, com limpeza de erro e representação vazia sem `null`.

## Impact

- **frontend_admin**: `src/features/posts/form-view.js` (campo de anexo, upload, lista, remoção),
  `src/data/posts.js` (novas funções `uploadAttachment`/`deleteAttachment` + `FormData`),
  `src/ui/templates.js` (helper de renderização dos anexos, se necessário), `styles.css` (estilo
  do campo de anexo).
- **Dependência nova**: nenhuma (usa `FormData` nativo).
- **Fora de escopo**: edição de metadados do anexo; múltiplos arquivos em um único submit;
  preview inline do conteúdo do arquivo.
