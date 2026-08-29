## 1. Camada de dados

- [x] 1.1 Em `src/data/posts.js`, estender `getPosts(groupId, { archive })` para acrescentar
      `&archive=active|archived` à URL quando informado (mesmo padrão de `groupId`).
- [x] 1.2 Exportar a constante `ARCHIVE_AFTER_DAYS` (30) como referência única no PWA, espelhando
      o critério do backend (mesma janela nos dois lados).

## 2. Estado e ordenação da visão

- [x] 2.1 Adicionar `state.archive = "active"` (valor inicial) no `state` do app.
- [x] 2.2 Em `src/features/feed/feed.js`, criar `sortByDate(posts)` (dateISO desc) para a visão
      "Arquivo", **sem tocar** em `sortFeed` (urgentes → não-lidos → recentes) usado na visão "Ativos".

## 3. Aba/toggle "Ativos | Arquivo"

- [x] 3.1 Adicionar o container da aba no `index.html` (acima de `#chips`), ex.: `#archive-tabs`.
- [x] 3.2 Criar `renderArchiveTabs()` em `feed.js` seguindo o padrão visual dos chips
      (`aria-pressed`, mesma classe `.chip`), com as opções "Ativos" e "Arquivo".
- [x] 3.3 No clique da aba, atualizar `state.archive`, re-renderizar a aba e chamar `renderFeed()`.
- [x] 3.4 Chamar `renderArchiveTabs()` na inicialização do feed (junto de `renderChips()`/`renderEnvSelector()`).

## 4. Renderização por visão

- [x] 4.1 Em `renderFeed()`/`visiblePosts()`, passar `state.archive` para `getPosts` e selecionar a
      ordenação: `sortFeed` para "active", `sortByDate` para "archived".
- [x] 4.2 Garantir que categoria (`state.filter`) e ambiente (`state.activeGroupId`) continuam
      sendo aplicados dentro da visão atual (troca de aba preserva os filtros ativos).
- [x] 4.3 Empty state próprio para o arquivo ("Nenhum comunicado arquivado"), distinto do feed ativo.
- [x] 4.4 Estilo dos tabs em `styles.css` (consistente com `.chip`; estado ativo destacado).

## 5. Interações dentro do arquivo

- [x] 5.1 Confirmar que curtir/confirmar leitura/marcar como não lido funcionam nos cards e no
      sheet de posts da visão "Arquivo" (reutilizam `bindActionContainer`; nenhuma mudança de
      mecânica — validar que `renderFeed()` respeita `state.archive`).

## 6. Build/verificação

- [x] 6.1 Rodar `npm run build` (PWA) e `node --check` nos arquivos alterados.
- [x] 6.2 Validar visualmente no navegador (Fase 5 da esteira): feed ativo sem antigos, aba
      "Arquivo" lista antigos por data, troca de aba preserva filtros, interações no arquivo
      funcionam; screenshots em `/tmp/opencode/`.