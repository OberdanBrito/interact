## Context

O formulário de comunicado (`frontend_admin/src/features/posts/form-view.js`) já tem um campo
datetime-local no padrão desejado — "Agendamento" (`f-publish-at`), com `toDatetimeLocal()` para
converter ISO → valor do input e hint textual. A listagem (`src/ui/templates.js` →
`postRowHTML`) já renderiza selos por estado (`scheduledBadgeHTML`, `draftBadgeHTML`,
`pinnedBadgeHTML`, `urgentBadgeHTML`) na `cell-title` e a coluna "Data" na `cell-meta`. O backend
(change `validade-expiracao-comunicados` da componente backend) passa a expor `expiresAt`
(ISO|null) e `expired` (boolean) no payload e a tratar `expiresAt: ""` como limpeza. Ver
proposal.md — Why; requisitos em specs/posts/spec.md.

## Goals / Non-Goals

**Goals:**
- Campo opcional "Validade" no formulário (criar e editar), com valor vazio quando não há
  `expiresAt` (nunca `"null"`).
- Selo "Expirado" + data de validade na listagem quando `expired: true` no payload.
- Reativação pela edição: limpar o campo e salvar envia `expiresAt: ""`.

**Non-Goals:**
- Sem ação rápida de reativar na listagem (a reativação é via formulário — escopo enxuto).
- Sem mudança de contrato em `src/data/posts.js` (assinaturas das funções exportadas estáveis;
  o payload do backend já chega com `expiresAt`/`expired`).
- Sem mudanças em backend/PWA (changes próprios).

## Decisions

### D1 — Campo "Validade" reusa o padrão do campo "Agendamento"
Decisão: input `datetime-local` (`f-expires-at`) ao lado de "Agendamento", reutilizando
`toDatetimeLocal()` para popular o valor e o mesmo padrão de `field-hint`/`field-error`. O campo
aparece **sempre** (criar e editar) — diferente do agendamento, que some em comunicado publicado.
Hint: "Em branco = sem validade. Ao expirar, o comunicado sai do app automaticamente."
Alternativa descartada: campo de texto livre — perde a UX de seletor de data/hora já adotada.

### D2 — Payload no submit: vazio omite/limpa; preenchido vira ISO
Decisão: no submit, campo vazio → criação omite `expiresAt`; edição envia `expiresAt: ""`
(limpa — reativa). Preenchido → `new Date(raw).toISOString()`. Sem validação de futuro (o backend
aceita passado = expiração imediata); o input datetime-local já garante formato válido, então não
há validação extra de data no front.

### D3 — Selo "Expirado" na cell-title e data de validade na coluna "Data"
Decisão: novo `expiredBadgeHTML()` (`badge badge-expired`, ícone de relógio/alerta) renderizado
em `postRowHTML` quando `post.expired === true`, **antes** dos demais selos (sinal de estado
domina). A coluna "Data" (`cell-meta`) ganha, quando `expiresAt` presente, uma linha secundária
"Expira em {data}" abaixo da data de publicação (reuso de `fullDate`); sem `expiresAt`, mantém
apenas a data atual. Alternativa: nova coluna "Validade" — polui a tabela para um campo raro.

### D4 — Reativação pela edição, sem botão dedicado
Decisão: reativar = abrir o comunicado (link "Editar" existente), limpar o campo de validade e
salvar (`PUT` com `expiresAt: ""`). Sem ação na listagem: as ações pontuais existentes
(publicar rascunho, fixar) existem porque o backend valida a transição; aqui a reativação é uma
edição de campo, que o formulário já cobre.

## Risks / Trade-offs

- **[Admin digita data no passado e expira sem querer]** → o backend aceita passado (expiração
  imediata). Mitigação: hint no campo; o selo "Expirado" aparece na listagem imediatamente,
  tornando o efeito visível e reversível (limpar o campo).
- **[Comunicado expira enquanto o admin está com o formulário aberto]** → salvar com campo vazio
  reativa; salvar sem tocar no campo mantém o valor original. Comportamento consistente com
  "limpar = reativar".
- **[Selos acumulam (Expirado + Fixado + Urgente)]** → o selo de expirado é o primeiro; não há
  conflito visual — segue o padrão de múltiplos selos já existente.

## Migration Plan

- Sem migração: a UI lê `expiresAt`/`expired` que chegam no payload; rollback = remover o campo
  do formulário e o selo da listagem (payload antigo sem `expired` é tratado como falsy).

## Open Questions

- Nenhuma.