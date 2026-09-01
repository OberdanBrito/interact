## Context

Ver proposal.md - Why. Estado atual: `GET /api/posts` (`src/routes/posts.js:93-166`) lê `category`,
`search`, `groupId`, `archive`, aplica visibilidade (admin `createdBy`; colaborador broadcast +
grupos, não expirados, `published`), ordena `{ pinned: -1, dateISO: -1 }` e devolve um **array**
plano. Não há paginação (nenhum `limit`/`skip`/`cursor`). A ordenação inteligente
(fixado → urgente → não-lido → recente) é 100% client-side no PWA (`feed.js:103-115`), pois
"não-lido" hoje só existe no cliente (`localStorage interact.user.<email>.read`). O modelo
`Comunicado` não tem índices explícitos (só `_id` string sequencial `p01…`); `Interaction` tem
`{ postId, userId }` unique. Backend não sabe "não-lido" em tempo de query.

Como o `_id` não é cursor natural (string sequencial não monotônica com `dateISO`), o cursor será
um **keyset** do par de ordenação + `_id`.

## Goals / Non-Goals

**Goals:**
- `GET /api/posts` suporta paginação por cursor (keyset), envelope `{ items, nextCursor, hasMore }`
  quando `limit`/`cursor` presentes, e array simples caso contrário (retrocompatível).
- Ordenação inteligente do feed do colaborador (fixado → urgente → não lido → recente) calculada no
  backend a partir do conjunto de interações do usuário autenticado.
- Compatibilidade com `?search`, `?archive`, `?category`, `?groupId` e visibilidade, com o cursor
  válido apenas para o mesmo recorte.
- Cursor estável frente a inserções de novos posts no topo (SSE I-07): keyset, não offset.

**Non-Goals:**
- Não paginar com offset (`?page`) — explicitamente descartado (quebra com inserções concorrentes).
- Não alterar a ordenação do **arquivo** (segue data desc) nem a do **admin** (segue fixado → data).
- Não migrar o cache offline para múltiplas tabelas; o acumulado paginado entra no recorte atual.
- Não adicionar filtros por status no admin (não existem hoje; fora do escopo).
- Não construir um sistema de busca global; apenas manter `?search` existente.

## Decisions

**D1 — Cursor keyset (opaco) em vez de offset.** O cursor codifica (base64 de JSON) a tupla de
ordenação do último item: `(pinned, urgent, unread, dateISO, _id)` para a visão ativa e
`(dateISO, _id)` para o arquivo. A próxima página filtra com `$or` lexicográfico "depois da tupla".
Alternativa (offset `?page=3`) rejeitada: com posts chegando via SSE, a página N mudaria de conteúdo
e duplicaria/pularia itens.

**D2 — "não-lido" via injeção do conjunto `read` (sem `$lookup`).** Antes da query, buscar uma vez
o conjunto `read` do usuário: `Interaction.find({ userId: req.user.id, read: true }).distinct('postId')`
→ array `readIds`. No pipeline de agregação, `$addFields: { _unread: { $not: { $in: ["$_id", readIds] } } }`.
Isso evita um `$lookup` caro por documento/usuário. Alternativa (`$lookup` em `interactions`)
rejeitada como mais lenta; adotamos injeção e verificamos performance com um índice composto
`{ userId: 1, postId: 1 }` (já coberto pelo unique `{postId, userId}` — criar índice reverso
`{ userId: 1, read: 1, postId: 1 }` se necessário).

**D3 — Ordenação por visão.** Para colaborador: visão ativa (sem `?archive` ou `=active`) usa
`pinned DESC → urgent DESC → unread ASC (não lido primeiro) → dateISO DESC → _id ASC`;
`?archive=archived` usa `dateISO DESC → _id ASC`. Para admin: sempre `pinned DESC → dateISO DESC →
_id ASC`, sem urgente/não-lido. Implementado via um pipeline de agregação único que calcula os
campos de ordenação e aplica `$sort` + filtro de cursor + `$limit`.

**D4 — Envelope condicionado à presença de `limit`/`cursor`.** Sem `limit`/`cursor` → array simples
(retrocompatibilidade; admin continua assim). Com `limit` → `{ items, nextCursor, hasMore }`.
`hasMore` calculado com `$limit(limit + 1)` e descarte do extra. `limit` default `DEFAULT_LIMIT=20`,
teto `MAX_LIMIT=100`; inválido → 400.

**D5 — Camada de resposta.** Reaproveitar `toPost`/`isPostEligible` para serialização dos itens de
cada página; incluir campos derivados (`status`, `expired`, `pinned`, `targetGroupNames`) em cada
`items`. Um pequeno helper `encodeCursor(tuple)`/`decodeCursor(seq)` mantém a janela de sort opaca.

**Alternativa considerada (D6) — Paginar só com `dateISO`:** descartada porque, com a ordenação
por fixado/urgente/não-lido, `dateISO` sozinho não produz ordem estável entre itens de prioridades
diferentes (um não-lido antigo pode vir antes de um lido recente).

## Risks / Trade-offs

- [Ordenação por não-lido exige o conjunto `read` do usuário em cada request] → Injeção do array
  `readIds` (uma query leve, indexada) em vez de `$lookup`; se `readIds` crescer muito, considerar
  índice reverso `{ userId: 1, read: 1, postId: 1 }` e medir. Verificar a query com `explain()` antes
  de fechar.
- [Cursor com tupla de 5 campos é mais complexo de manter] → Centralizar encode/decode e o `$or` de
  cursor em uma função única, coberta por testes; o `_id` entra como desempate determinístico para
  evitar ambiguidade quando `dateISO` colide.
- [Mudança pontual do shape (envelope) pode quebrar consumidores antigos] → Envelope só quando
  `limit`/`cursor` é enviado; PWA e admin são atualizados nesta mesma issue. Qualquer consumer
  legado sem `limit` continua com array.
- [Regex de `?search` + agregação paginada pode degradar performance com muitos posts] → Manter
  `?search` no estágio `$match` antes de `$addFields`/`$sort` e indexar `dateISO`/`published`/
  `createdBy` (adicionar índices compostos `{ published: 1, dateISO: -1 }` e
  `{ createdBy: 1, dateISO: -1 }`).
- [Arquivo usa chave de cursor diferente (dateISO) da ativa (tupla)] → Como o recorte é fixo por
  request, o cursor é sempre decodificado contra a mesma janela de sort da chamada; um cursor de
  uma visão usada em outra é tratado como inválido (400).

## Migration Plan

1. Adicionar os índices propostos e permitir rolling deploy (rota antiga continua servindo array).
2. Publicar a rota paginada preservando o array quando sem `limit`; PWA/admin migram para `limit`.
3. Rollback: basta remover o envelope/agregação e voltar ao `find().sort()` atual (sem quebra de
   contrato), já que o array permanece o default sem `limit`.

## Open Questions

- Nenhum que mude spec/approach/tasks. (O "verificar performance do `$lookup` vs injeção" está
  resolvido em D2 — usaremos injeção; se o `explain()` mostrar custo alto, o ajuste é isolado na
  implementação sem mudar o contrato.)
