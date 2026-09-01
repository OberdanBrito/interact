## Context

O endpoint `GET /api/interactions/summary` já existe em `src/routes/interactions.js` e hoje
agrega todas as interações via `Interaction.find({}).lean()` com um loop simples, produzindo
`{ [postId]: { reads, likes } }` (veja o proposal para a motivação). A alteração é apenas somar
filtros opcionais, sem re-implementar a agregação nem alterar o modelo `Interaction`
(campos `read`, `liked`, `readAt`, `likedAt`, `userId`, índices únicos por `(postId, userId)`
e `(userId, read, postId)`).

## Goals / Non-Goals

**Goals:**
- Adicionar filtros opcionais `desde`/`ate` (ISO) e `groupId` ao summary, retrocompatíveis.
- Manter o formato `{ [postId]: { reads, likes } }` e o comportamento atual quando nenhum
  filtro for informado.
- Validar datas inválidas com `400`.

**Non-Goals:**
- Não alterar o contrato de resposta nem criar endpoints novos.
- Não introduzir paginação nem agregação por `$lookup`/`$group` no MongoDB (o volume atual é
  pequeno e o loop em memória é aceitável — mudaria apenas se houvesse necessidade de escala).
- Não alterar a semântica de visibilidade nem de elegibilidade dos colaboradores.

## Decisions

- **Filtro de período baseado na data de interação** (`readAt`/`likedAt`): o recorte de período
  deve considerar quando a interação ocorreu. Um colaborador pode ter lido fora do período mas
  revertido dentro (ou vice-versa); a data de interação relevante é a última transição
  (`readAt`/`likedAt`). Decisão: um documento é incluído no recorte se `readAt` **ou** `likedAt`
  cair no intervalo. Alternativa considerada: usar `createdAt`/`updatedAt` (timestamps) — é mais
  simples, mas menos precisa para entender "quando leu/curtiu"; rejeitada em favor dos campos
  semânticos.
- **Filtro de grupo via `userId`:** o summary agrega por interação, não por grupo. Para filtrar
  por grupo é preciso saber a que grupos o colaborador pertence. Decisão: buscar os
  `User` afetados (com `groupIds`) uma única vez e montar um `Map<userId, groupIds>` para
  decidir a inclusão, evitando `$lookup`. A semântica segue a da rota `GET /api/interactions`
  (agregado por grupo): um colaborador pode pertencer a múltiplos grupos; o filtro de grupo
  inclui a interação se o usuário pertence ao grupo informado. Reutilizar a mesma abordagem do
  `members`/raiz (`User.find(...).select("groupIds")` + `Group.find()`).
- **Validação de datas:** `desde`/`ate` devem ser datas ISO válidas; se inválidas → `400` com
  `{ error: "Data inválida" }` (coerente com o padrão de erros da rota). Datas inválidas nunca
  devem ser silenciosamente ignoradas.
- **Retrocompatibilidade:** sem `desde`, `ate` ou `groupId`, o query permanece
  `Interaction.find({})` — nenhum recorte, comportamento idêntico ao atual.
- **Formato de resposta inalterado:** mesmo com filtros, o valor por `postId` continua
  `{ reads, likes }` (números, nunca `null`), satisfazendo o contrato consumido pelo admin.

## Risks / Trade-offs

- [Filtro por período com `readAt`/`likedAt` pode "duplicar" contagem quando ambos caem no
  intervalo] → Mitigação: a checagem é de inclusão (OR), e cada documento representa um único
  colaborador/comunicado; os totais por `postId` batem com o agregado existente.
- [Filtro por grupo exige conhecer `groupIds` dos usuários — pode haver muitos usuários] →
  Mitigação: busca única de usuários afetados com `select("groupIds")`; aceitável no volume
  atual; se crescer, evoluir para agregação no MongoDB.
- [Adicionar filtros sem quebrar consumidores existentes] → Mitigação: parâmetros opcionais e
  formato de resposta idêntico; nenhum consumidor atual envia os novos parâmetros.
