## Why

Hoje o colaborador lê comunicados como texto no PWA (feed + bottom sheet). A I-03 permite ao admin
anexar arquivos/imagens a um comunicado; o PWA precisa exibir esses anexos com link de
download/visualização, respeitando a visibilidade do comunicado (o anexo só aparece para quem já
vê o post) e representando um comunicado sem anexo de forma limpa ("—", nunca `null`).

## What Changes

- **frontend_pwa** — exibição de anexos do comunicado:
  - no **bottom sheet** de detalhe, renderizar a lista de anexos com link de
    download/visualização apontando para `GET /api/posts/:id/attachments/:attachmentId`;
  - comunicado sem anexo exibe ausência limpa (nada do literal `null`); metadados já vêm no post
    (`attachments: []` do backend);
  - seguir o mesmo tratamento de acessibilidade/estilo dos demais elementos do feed.
- **cache offline** — os binários dos anexos não são cacheados (apenas metadados); a exibição do
  anexo offline é no-op gracioso (sem quebra), dado que o download depende de rede.

## Capabilities

### New Capabilities
<!-- Nenhuma capability nova; a experiência de leitura do colaborador é estendida. -->

### Modified Capabilities
- `interacoes-colaborador`: o feed/detalhe do comunicado passa a exibir os anexos do comunicado
  (arquivos/imagens) com link de download/visualização, respeitando a visibilidade do comunicado e
  representando ausência sem `null`.

## Impact

- **frontend_pwa**: `src/features/feed/templates.js` (helper de renderização da lista de anexos no
  card e/ou no sheet), `src/ui/sheet.js` (exibição dos anexos no detalhe), `index.html` (container
  da lista de anexos no sheet), `src/data/cache.js` (metadados já cacheados; sem mudança para
  binários), `styles.css` (estilo dos anexos).
- **Dependência nova**: nenhuma.
- **Fora de escopo**: pré-visualização inline do arquivo; download em batch; cache offline do
  binário; alteração do esquema do feed.
