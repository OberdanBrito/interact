# Design — Fixar comunicado importante (backend)

## Context

O model `Comunicado` não possui flag de fixação; `GET /api/posts` ordena somente por
`dateISO` desc (`.sort({ dateISO: -1 })`); `PUT /api/posts/:id` faz update parcial sem tratar
`pinned`. O colaborador recebe os posts e reordena client-side no PWA — o backend precisa
garantir a ordenação pinned-primeiro no contrato da API.

## Goals / Non-Goals

- **Goal:** persistir `pinned`, expô-lo no payload, ordenar pinned primeiro no GET e validar
  pin somente em publicados no PUT.
- **Non-Goal:** criar endpoint de "fixar" separado; permitir pin no POST; mudar a ordem do
  feed no lado do admin (o admin reordena client-side por data).

## Decisions

### D1 — Campo `pinned` no schema
`pinned: { type: Boolean, default: false }` no `comunicadoSchema`. Sem `required` (default),
sem índice (volume de comunicados é baixo; consulta é filtrada por visibilidade antes).
**Alternativa:** campo no `toPost` derivado — rejeitado, pois o critério exige persistência.

### D2 — Ordenação pinned-primeiro no GET
Trocar `.sort({ dateISO: -1 })` por `.sort({ pinned: -1, dateISO: -1 })`. MongoDB ordena
booleans `false < true`; `-1` coloca `true` (fixado) primeiro e, dentro do grupo, `dateISO`
desc. Vale para colaborador e admin. **Alternativa:** aggregation com `$sort`/`$setWindowFields`
— desnecessária para o volume.

### D3 — PUT valida pin somente em publicado
Adicionar `pinned` ao destructuring do body e tratar antes do update parcial, no estilo do
gate de publicação (I-02):

```js
if (pinned !== undefined) {
  if (doc.published !== true) {
    return res.status(400).json({ error: "Apenas comunicados publicados podem ser fixados" });
  }
  doc.pinned = pinned === true;
}
```

Rascunho (`draft: true` ⇒ `published: false`) e agendado (`published: false` com `publishAt`
futuro) caem no `400`. **Alternativa:** aceitar pin em qualquer estado — rejeitada pelo dono
(decisão: backend 400 + admin oculta a ação).

### D4 — `toPost` expõe `pinned`
Retorno adiciona `pinned: doc.pinned === true` (normaliza para booleano).

### D5 — POST não aceita pinned
`pinned` não entra no destructuring do `POST` — pin é ação pós-publicação, feita pela
listagem do admin via `PUT`.

## Risks / Trade-offs

- [Clientes antigos não conhecem `pinned`] → campo novo é aditivo; ausência no body é
  ignorada; sem quebra de contrato.
- [`doc.published` usado como gate pega agendado futuro como "não publicado"] → é o
  comportamento desejado: só comunicado efetivamente liberado pode ser fixado.

## Migration Plan

Nenhum dado a migrar: documentos existentes recebem `pinned: false` via default do Mongoose
na primeira gravação; na leitura, `doc.pinned === true` cobre ausência.

## Open Questions

Nenhuma. Decisão do dono (backend 400 + admin oculta ação) já registrada no proposal.