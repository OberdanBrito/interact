## 1. Índices e helpers de cursor

- [x] 1.1 Adicionar índices compostos no modelo `Comunicado` (`{ published: 1, dateISO: -1 }`,
      `{ createdBy: 1, dateISO: -1 }` e `{ userId: 1, postId: 1 }` para leitura de interações) e
      verificar com `Comunicado.createIndexes()` / `ensureIndexes()` que os índices foram aplicados
- [x] 1.2 Criar helper `encodeCursor(tuple)`/`decodeCursor(seq)` (base64 de JSON) para a tupla de
      ordenação e validar em teste unitário que o round-trip preserva valores
- [x] 1.3 Extrair a janela de sort para a view ativa (`pinned, urgent, unread, dateISO, _id`) e para
      o arquivo (`dateISO, _id`) em função reutilizável e validar com teste unitário

## 2. Conjunto "não-lido" do usuário

- [x] 2.1 Buscar o conjunto `read` do usuário autenticado
      (`Interaction.find({ userId: req.user.id, read: true }).distinct('postId')`) no handler de
      `GET /api/posts` e verificar o array retornado via log/teste
- [x] 2.2 Construir o campo derivado `_unread` (não presente no conjunto `read`) no pipeline de
      agregação e verificar que um post lido recebe `_unread: false` em um teste de integração

## 3. Pipeline de agregação com ordenação inteligente

- [x] 3.1 Substituir o `Comunicado.find(filter).sort({ pinned: -1, dateISO: -1 })` atual por um
      pipeline de agregação (`$match` de visibilidade/filtros → `$addFields` dos campos de ordenação →
      `$sort` → cursor `$match` → `$limit(limit + 1)`) e validar o shape com `Node.js`/QA manual
- [x] 3.2 Aplicar a ordenação por visão: colaborador ativa = fixado→urgente→não-lido→recente,
      arquivo = data desc, admin = fixado→data desc; validar os 3 cenários em QA
- [x] 3.3 Implementar o filtro de cursor (`$or` lexicográfico "depois da tupla") usando janela de
      sort da chamada; validar que a página seguinte não duplica nem pula itens
- [x] 3.4 Calcular `hasMore` por `$limit(limit + 1)` (descartando o extra) e validar que a última
      página retorna `hasMore: false` e `nextCursor: null`

## 4. Contrato de resposta (envelope vs array)

- [x] 4.1 Quando `limit`/`cursor` presentes, responder `{ items, nextCursor, hasMore }` (itens via
      `toPost`); sem eles, responder o array simples — validar ambos os shapes via `curl`
- [x] 4.2 Validar `limit` (inteiro, > 0, ≤ `MAX_LIMIT`) e retornar `400` para valor inválido;
      validar cursor indecifrável/recorte divergente como `400`
- [x] 4.3 Confirmar que o admin (`createdBy`) e a visibilidade do colaborador continuam valendo em
      cada página (`?groupId`, `?archive`, `?search`, `?category`) via QA de integração

## 5. Testes e verificação final

- [x] 5.1 Rodar `npm run test:integration` (backend) e confirmar que os cenários de paginação
      (primeira página, próxima, última, sem parâmetros, limit inválido, busca/arquivo paginados)
      passam
- [x] 5.2 Validar com `node --check`/build que a rota compila sem erros e sem `sortFeed` residual
