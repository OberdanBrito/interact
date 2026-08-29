## 1. Modelo de dados

- [x] 1.1 Em `src/models/Comunicado.js`, adicionar `draft: { type: Boolean, default: false }`
- [x] 1.2 Tornar `title` e `categoryId` não-obrigatórios no schema, com defaults
      (`title: { type: String, default: "" }`, `categoryId: { type: String, default: "geral" }`),
      mantendo o restante do schema inalterado

## 2. Serialização (toPost)

- [x] 2.1 Em `src/routes/posts.js`, atualizar `toPost` para reportar `status: "rascunho"`
      quando `doc.draft === true` (antes de `agendado`/`publicado`)
- [x] 2.2 Garantir que `published` continue refletindo drafts como `false` (`published !== false`)
      sem quebrar o filtro do colaborador

## 3. Criação de rascunho (POST)

- [x] 3.1 Em `src/routes/posts.js`, aceitar `status: "draft"` (ou `draft: true`) no corpo do POST
- [x] 3.2 Quando for rascunho: não exigir título, autor nem corpo; criar com
      `published: false`, `draft: true`, `publishAt: null`
- [x] 3.3 Quando NÃO for rascunho: manter as validações atuais (título, categoria; agendamento
      futuro se `publishAt` presente)

## 4. Edição e transição de rascunho (PUT)

- [x] 4.1 Em `src/routes/posts.js`, aceitar `status` no PUT de um rascunho e aplicar transição:
      `draft` → mantém rascunho; `published` → `published: true`, `draft: false`,
      `publishAt: null`; `scheduled`/`publishAt` futuro (sem `status: draft`) → agendar
- [x] 4.2 Aplicar validação relaxada ao editar rascunho (não exige título/autor/corpo), mas exigir
      os campos obrigatórios ao publicar (`status: "published"`)
- [x] 4.3 Permitir alterar `targetGroups` no PUT somente enquanto `published === false` (rascunho ou
      agendado); manter 400 de imutabilidade para publicados
- [x] 4.4 Garantir invariantes: `draft: true` implica `publishAt: null` e `published: false`

## 5. Verificação

- [x] 5.1 Rodar `node --check` nos arquivos alterados (`src/models/Comunicado.js`,
      `src/routes/posts.js`)
- [x] 5.2 Teste de integração em MongoDB real (docker): criar rascunho, editar rascunho incompleto,
      verificar invisibilidade ao colaborador, publicar rascunho, agendar rascunho
