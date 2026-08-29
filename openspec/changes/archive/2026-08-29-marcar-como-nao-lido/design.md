## Context

O PWA (Vite vanilla JS) gerencia o estado de leitura no localStorage por usuário
(`state.userData.read`), sincroniza com o backend via fila offline (`data/sync.js`,
`PUT /api/interactions/:postId`) e mantém a ordenação inteligente no feed
(urgentes → não-lidos → recentes) e o badge de não-lidos (`refreshBadge`). Hoje só existe o
caminho lido (`markReadPersist`, `read: true`); falta o caminho inverso.

## Goals / Non-Goals

**Goals:**
- Reversão de leitura em um clique, reutilizando o padrão de persistência/sincronização existente.
- Efeito imediato no feed (ordenação) e no badge, sem depender de reload.

**Non-Goals:**
- Não tocar no caminho de curtida (`liked`).
- Não alterar a regra de visibilidade nem o cache offline de posts (Dexie).
- Não criar nova tela; a ação entra nos templates existentes (`actionButtonsHTML`).

## Decisions

- **Botão único em `actionButtonsHTML` (card e sheet).** Quando `read === true`, o template
  passa a renderizar "Marcar como não lido" (classe `js-unread`); quando `read === false`, volta a
  mostrar o estado atual (ponto de leitura do `ack` ou nada para `auto`). Isso cobre os dois
  critérios (card e sheet) com um único ponto de renderização. Alternativa: ação só no sheet —
  rejeitada porque o critério de ordenação pede efeito perceptível no card e o rodapé já é o local
  natural das ações.
- **Persistência espelhada a `markReadPersist`.** Novo `markUnreadPersist(postId)` em
  `session.js`: remove `postId` de `state.userData.read`, persiste no localStorage,
  `enqueue(postId, { read: false })`, `syncNow()` e `refreshBadge()`. Alternativa: parametrizar
  `markReadPersist` com direção — rejeitada por clareza e para manter o `refreshBadge` condicional
  (marcar como não lido sempre deve recontar o badge, mesmo sem Badging API o estado local já muda).
- **Reordenação via `renderFeed()`.** Após a reversão, chamar `renderFeed()` (que re-sorta via
  `sortFeed` lendo `userData.read`) para o post voltar ao grupo de não-lidos. `syncPostUI` já
  atualiza o card/sheet individualmente; o `renderFeed` é quem aplica a nova ordenação.
- **Handler em `bindActionContainer`.** Adicionar o seletor `.js-unread` no mesmo container de
  cliques já usado para like/read (interactions.js), sem novo listener global.

## Risks / Trade-offs

- [Re-render do feed reseta scroll/foco] → Aceitável: mesma abordagem já usada na troca de
  categoria/ambiente; reversão é ação pontual do usuário.
- [Estados divergentes entre localStorage e backend offline] → A fila offline já garante a
  sincronização final (`{ read: false }` enviado na reconexão), igual ao caminho de `read: true`.
- [`refreshBadge` duplo (persist + renderFeed)] → Inofensivo: idempotente; mantém consistência se
  apenas um dos caminhos executar.