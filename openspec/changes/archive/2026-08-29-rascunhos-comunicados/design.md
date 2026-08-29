## Context

O backend modela publicação com duas flags binárias derivadas: `published` (Boolean) e
`publishAt` (Date, usado por agendamento — I-01). `src/routes/posts.js` valida criação/edição e o
helper `toPost` deriva `status: "publicado" | "agendado"`. O colaborador nunca vê posts com
`published: false` (filtro `{ published: true }` no GET), o que garante que um rascunho não vaza.

Rascunho é o terceiro estado: salvo, não publicado, sem data de liberação, **editável com campos
incompletos** (título/corpo podem faltar). Hoje não há como criá-lo.

## Goals / Non-Goals

**Goals:**
- Permitir criar e editar rascunhos com validação relaxada (campos obrigatórios só ao publicar).
- Rascunho invisível a colaboradores (reuso do filtro `published: true`).
- Transicionar rascunho → publicado ou → agendado quando pronto.
- Manter compatibilidade total com o agendamento (I-01) e com o PWA (que não muda).

**Non-Goals:**
- Não alterar a branch/rotas que o PWA colaborador consome (nenhuma mudança de comportamento
  visível a ele).
- Não criar sistema de múltiplos rascunhos por usuário nem revisões/histórico de edição.
- Não mudar o comportamento de agendamento existente (I-01) além do necessário.

## Decisions

### D1 — Modelagem: flag `draft: Boolean` em vez de enum `status`
Manter `published` e `publishAt` e **adicionar `draft: { type: Boolean, default: false }`** no
model `Comunicado`. O estado é derivado:
- Rascunho: `draft === true` (com `published === false`, `publishAt === null`)
- Agendado: `draft !== true && published === false && publishAt futuro`
- Publicado: `published === true`

**Por quê:** o scheduler, o GET de listagem e o PWA já dependem de `published`. Adicionar um enum
`status` exigiria migrar todos esses pontos e sincronizar `status` com `published`, aumentando
risco. Uma flag independente é aditiva e de baixo risco.

**Alternativas consideradas:** enum `status` no model (rejeitada por exigir migração ampla e
manter duas fontes de verdade `status`×`published`).

### D2 — `toPost` passa a reportar `rascunho`
Novo mapeamento de `status` no helper `toPost`:
- `draft === true` → `"rascunho"`
- senão `published === false` → `"agendado"` (comportamento atual)
- senão → `"publicado"`

### D3 — Validação relaxada em rascunho
- **Schema**: `title` e `categoryId` deixam de ser `required` no nível do schema, com
  `title: { default: "" }` e `categoryId: { default: "geral" }`. A obrigatoriedade passa a ser
  validada **na rota** — somente quando o resultado não for rascunho.
- **POST/PUT**: se o payload/resultado é rascunho (`status: "draft"` / `draft: true`), não exige
  título, autor nem corpo. Caso contrário (publicar/agendar), mantém as validações atuais
  (título, categoria, e agendamento futuro) e, ao **publicar** um rascunho, passa a exigir também
  autor (nome) e conteúdo não vazio — valores efetivos (payload ou já salvos no documento).
  Decisão do dono no QA I-02: rascunho publicado sem corpo/autor não deve ser liberado.

### D4 — Transição de estado no PUT
O PUT aceita `status` para rascunhos:
- `status: "draft"` → mantém/`draft: true`, `published: false`, `publishAt: null`.
- `status: "published"` → `draft: false`, `published: true`, `publishAt: null`.
- `status: "scheduled"` (com `publishAt` futuro) → `draft: false`, `published: false`, agenda.
- Rascunho não publicado ainda permite editar `targetGroups` (alvo) — hoje o PUT rejeita sempre;
  passa a permitir **somente enquanto `published === false`**, cobrindo rascunho/agendado sem
  quebrar a imutabilidade de comunicados já publicados.

### D5 — Validação de agendamento tem precedência sobre rascunho
Se o payload traz `publishAt` futuro + `status` não-draft, o documento é tratado como agendado
(`draft: false`). Draft + `publishAt` não coexistem: publicar um rascunho com data = agendar.

## Risks / Trade-offs

- [Tornar `title` opcional no schema pode afetar outras criações] → A rota valida
  obrigatoriedade de título para todo non-rascunho, mantendo o contrato externo; o PWA não cria
  posts, então o risco é nulo do lado colaborador.
- [Permitir editar alvo em não-publicado amplia levemente o escopo] → Decisão registrada;
  benefício (ajustar rascunho antes de publicar) supera o custo, e o `published: false` mantém a
  proteção principal.
- [Derivar estado de 2 campos (published/draft) pode gerar estados inválidos] → Definição D1 é
  exaustiva e o PUT força invariantes; `draft: true` implica `publishAt: null` e `published: false`.
