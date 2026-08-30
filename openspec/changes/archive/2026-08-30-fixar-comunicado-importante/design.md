# Design — Fixar comunicado importante (frontend_pwa)

## Context

O feed renderiza cards via `postCardHTML` (selos categoria/urgente/direcionado, unread-dot,
time) e ordena com `sortFeed` (urgente → não-lidos → recentes) na visão "Ativos" e
`sortByDate` (data desc) na visão "Arquivo" (I-12). Não há noção de fixado.

## Goals / Non-Goals

- **Goal:** exibir o selo "Fixado" no card e colocar comunicados fixados no topo da visão
  "Ativos", vencendo a urgência.
- **Non-Goal:** mudar a ordenação do "Arquivo" (mantém data desc, I-12); alterar o contrato de
  dados (`pinned` já vem no payload do backend).

## Decisions

### D1 — Selo "Fixado" no card
Em `postCardHTML`, adicionar o selo "Fixado" (classe `badge badge-pinned`, ícone pin) na
`post-meta-row`, antes do selo de urgente, quando `post.pinned === true`. Independente de
urgência (issue: "selo de fixado independente de urgente"). Aplica-se às duas visões.

### D2 — `sortFeed` com pin primeiro
Inserir o pin como primeira chave de comparação em `sortFeed` (visão "Ativos"), antes da
lógica urgente:

```js
if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
// …demais chaves (urgente, não-lido, recência) inalteradas
```

Assim pin vence urgente; múltiplos fixados caem na chave de recência (`dateISO` desc) que já
existe no comparador. **Alternativa:** particionar a lista em fixados + restantes e concatenar
— equivalente, mas menos reutilizável do comparador existente.

### D3 — Arquivo mantém `sortByDate`
`visiblePosts()` continua usando `sortByDate` na visão "Arquivo"; o pin não entra na
comparação (a posição no arquivo é por data). O selo continua aparecendo via `postCardHTML`.
Isso é consistente com a I-12 e não contradiz o spec (pin vence urgência na ordenação do
feed "Ativos").

### D4 — Estilo
`.badge-pinned` em `styles.css`, no padrão dos `.badge-*` existentes.

## Risks / Trade-offs

- [Comunicado fixado que envelhece e vai ao arquivo] → mantém o selo, mas perde a posição de
  topo (arquivo ordena por data). Comportamento esperado e documentado no spec (cenário
  "Arquivo mantém data desc").
- [Cache offline com `pinned` desatualizado] → cache Dexie guarda o último payload buscado;
  o pin é refletido no próximo sync do feed (sem divergência estrutural).

## Migration Plan

N/A — mudança de UI/ordenação apenas; nenhum dado novo.

## Open Questions

Nenhuma.