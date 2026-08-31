# INTERACT — DESIGN SYSTEM

> **O que este documento é:** o contrato de verdade para tudo que é visual no
> Interact. Toda implementação de UI (nova ou correção) **consulta este
> documento antes de escrever CSS** — do mesmo jeito que uma issue de backend
> consulta o `AGENTS.md` antes de tocar em código.
>
> **O que este documento NÃO é:** uma fila de tarefas. Uma tela nova que segue
> o que está aqui **não gera issue no projeto "Padrões visuais"**. Esse
> projeto existe só para (a) decisões de fundação ainda em aberto e (b) o
> saneamento pontual do débito já existente, listado na seção final. Depois de
> saneado, a manutenção da consistência é responsabilidade de seguir este
> documento — não de vigilância contínua.

**Escopo:** `frontend_admin` (painel administrativo) e `frontend_pwa` (app do
colaborador). Onde os dois divergem por razão de plataforma (não por
inconsistência), isso é documentado explicitamente — não eliminado.

**Versão:** 1.0 — consolidado em 31/08/2026 a partir do CSS real dos dois
frontends (`styles.css`, branches `frontend_admin` e `frontend_pwa`).

---

## 1. Como usar este documento

Ao implementar uma issue que toca UI:

1. **Antes de codar** — na etapa de planejamento (`design.md` do OpenSpec),
   verifique se o componente que você precisa já existe na Seção 3. Se
   existir, use-o como está. Se precisar de uma variação, ela deve ser
   expressável combinando os tokens da Seção 2 — não inventando um valor novo.
2. **Se o componente não existir** — implemente seguindo os tokens (cor,
   espaçamento, raio, tipografia, motion) da Seção 2. Isso já garante
   consistência sem precisar de aprovação visual separada.
3. **Se você precisar de um valor que não existe nos tokens** (uma cor nova,
   um espaçamento fora da escala) — **pare**. Isso é uma decisão de
   fundação, não uma implementação. Essa é a única situação que justifica
   abrir algo no projeto "Padrões visuais": você está propondo mudar o
   contrato, não seguindo ele.
4. **Registre o componente novo aqui** — ao final da issue, se você criou um
   componente reutilizável novo, adicione-o à Seção 3 no mesmo commit de
   documentação que já atualiza `AGENTS.md`/`ISSUES.md`. Não é uma issue
   separada; é o mesmo passo de "encerramento" que já existe no fluxo.

Isso resolve o problema de duplicidade de esforço: a governança visual
acontece **dentro** da issue funcional, não como uma segunda issue.

### 1.1 Princípio de resolução: o PWA lidera

O admin é usado por poucas pessoas, no desktop, esporadicamente. O PWA é
usado massivamente pelo colaborador, majoritariamente no celular, todo dia.
Isso significa que **os dois não têm o mesmo peso** ao decidir um padrão
compartilhado:

- Quando um componente existe nos dois frontends e diverge, **a
  implementação do PWA é a referência** — o admin se adapta a ela, nunca o
  contrário. Uma decisão otimizada para mouse/desktop não deve ditar a
  experiência de quem usa o produto no bolso.
- A única exceção é quando a divergência existe **por uma razão de
  plataforma real** (alvo de toque vs. clique, área segura do notch, etc.) —
  esses casos ficam documentados na Seção 3.1 como intencionais, não são
  "corrigidos" em nenhuma direção.
- Nenhuma mudança de token ou componente compartilhado deve ser validada só
  olhando o admin. Se afeta o PWA, valide no PWA.

Esse princípio já corrige a Seção 3.2 abaixo: onde a resolução proposta
adotava um valor do admin sobre o PWA sem uma razão de plataforma, ela foi
revisada.

---

## 2. Design Tokens

Já existe uma base sólida compartilhada — os dois frontends usam os mesmos
valores de cor, tipografia e alguns raios. A tabela abaixo é a versão
canônica; nomes marcados com ⚠️ divergem hoje entre os dois arquivos e devem
ser unificados para este nome.

### 2.1 Cor — Marca

| Token | Valor | Uso |
|---|---|---|
| `--navy-900` | `#0B1F3A` | Texto de maior ênfase, fundo escuro |
| `--navy-800` | `#0F2B52` | Botão primário, ícones ativos |
| `--navy-700` | `#16375F` | Hover de primário |
| `--navy-600` | `#1E4A7A` | — |
| `--navy-500` | `#2D5C96` | Categoria "Geral" |
| `--navy-100` | `#DCE7F5` | Fundos suaves (badges, avatar) |
| `--navy-050` | `#F0F5FB` | — |

### 2.2 Cor — Superfície e texto

| Token | Valor |
|---|---|
| `--bg` | `#F4F7FB` |
| `--surface` | `#FFFFFF` |
| `--text-primary` | `#16233A` |
| `--text-secondary` | `#5A6B85` |
| `--border` | `#E3EAF3` |
| `--shadow-card` | `0 1px 2px rgba(11,31,58,.06), 0 4px 16px rgba(11,31,58,.08)` |
| `--shadow-sheet` | `0 -8px 32px rgba(11,31,58,.18)` (usado no bottom sheet do PWA; **adotar também no admin** para modais) |

### 2.3 Cor — Semânticas

| Token | Valor | Uso |
|---|---|---|
| `--success` | `#15803D` | — |
| `--success-bg` | `#DCFCE7` | — |
| `--danger` | `#DC2626` | Erros, badge urgente |
| `--danger-bg` | `#FEE2E2` | — |
| `--warning-bg` | `#FEF3C7` | — |

### 2.4 Cor — Categorias de comunicado

| Token | Valor | Categoria |
|---|---|---|
| `--cat-geral` | `#2D5C96` | Geral |
| `--cat-rh` | `#0E9384` | RH |
| `--cat-ti` | `#6E56CF` | TI |
| `--cat-beneficios` | `#B45309` | Benefícios |

### 2.5 Tipografia

| Token | Valor |
|---|---|
| `--font-family` ⚠️ | `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--fs-display` | `28px` |
| `--fs-title` | `20px` |
| `--fs-body` | `15px` |
| `--fs-meta` | `13px` |
| `--fs-label` | `12px` |
| `--fs-input` | `16px` |

> ⚠️ **Ação de unificação:** o PWA usa `--font` para a mesma variável. Migrar
> para `--font-family` (nome usado no admin) nas duas branches.

### 2.6 Forma

| Token | Valor |
|---|---|
| `--radius-sm` | `10px` |
| `--radius-md` | `14px` |
| `--radius-lg` | `22px` |
| `--radius-pill` ⚠️ | `999px` |

> ⚠️ **Ação de unificação:** `--radius-pill` existe só no admin; o PWA usa o
> valor literal `999px` direto no `.badge`. Adicionar a variável ao PWA e
> substituir o literal.

### 2.7 Motion (GPU-only)

| Token | Valor |
|---|---|
| `--dur-fast` | `140ms` |
| `--dur-med` | `220ms` |
| `--ease-out` | `cubic-bezier(.22, .61, .36, 1)` |
| `--ease-spring` | `cubic-bezier(.34, 1.3, .64, 1)` (hoje só no PWA — ok manter exclusivo; usado para transições de sheet/instalação, sem equivalente no admin) |

### 2.8 Espaçamento — **não existe ainda**

Hoje cada componente usa valores de padding/gap/margin literais (`8px`,
`10px`, `12px`, `16px`, `24px`, `32px`...) espalhados pelos dois arquivos, sem
uma escala nomeada. Esta é a maior lacuna de fundação encontrada — proposta
para decisão:

| Token proposto | Valor | Baseado em uso real observado |
|---|---|---|
| `--space-1` | `4px` | gaps pequenos (badge interno) |
| `--space-2` | `8px` | gap padrão entre elementos |
| `--space-3` | `12px` | padding interno de item |
| `--space-4` | `16px` | padding de card, margin de campo |
| `--space-6` | `24px` | padding de seção |
| `--space-8` | `32px` | padding de página, empty state |

> 🔶 **Decisão pendente:** esta escala precisa da sua validação antes de
> entrar como token oficial — é a primeira coisa a resolver no projeto
> "Padrões visuais".

### 2.9 Layout — específicos de app (não unificar)

Estes tokens são legitimamente exclusivos de cada frontend, pois descrevem
estrutura de layout, não linguagem visual:

| Token | Frontend | Valor |
|---|---|---|
| `--sidebar-w` | admin | `264px` |
| `--topbar-h` | admin | `64px` |
| `--content-max` | admin | `1120px` |

---

## 3. Componentes — estado atual e especificação canônica

19 componentes hoje têm o mesmo nome de classe implementado separadamente nos
dois frontends. Abaixo, cada um com o veredito: **unificar** (bug de
duplicação a corrigir) ou **manter divergente** (diferença correta de
plataforma).

### 3.1 Divergência intencional — manter separado

| Componente | Motivo |
|---|---|
| `.icon-btn` | Admin: 36px quadrado (alvo de mouse). PWA: 44px circular (alvo de toque, dentro do mínimo de acessibilidade mobile). **Não unificar** — documentar as duas variantes como corretas por contexto de input. |
| `.login-card`, `.login-hint` | PWA é centralizado/mobile-first; admin é lateral/desktop. Diferença de layout justificada pelo form factor. |
| `.topbar` | PWA adiciona `padding-top: env(safe-area-inset-top)` (notch) e sombra; admin é sticky simples de desktop. Manter a base compartilhada (altura, cor, borda) mas permitir extensões por plataforma. |

### 3.2 Duplicação real — unificar

| Componente | Divergência encontrada | Resolução proposta |
|---|---|---|
| `.badge` | Admin: `padding: 3px 10px`. PWA: `height: 24px`. Geometrias diferentes pro mesmo elemento visual. | Adotar a versão do PWA (`height` fixa é mais previsível pra alinhamento com texto/ícone ao lado) nas duas. |
| `.btn-primary` | PWA define o componente completo (altura 48px, padding, display). Admin só sobrescreve cor, herdando forma de uma classe base `.btn` não documentada aqui. | Extrair um `.btn` base único (tamanho, padding, radius, motion) + modificadores de cor (`.btn-primary`, `.btn-secondary`) — mesmo padrão nos dois frontends. |
| `.spinner` | Admin: 16px, borda navy. PWA: 20px, borda branca translúcida (para uso sobre `.btn-primary` escuro). | Ambos os tamanhos são válidos por contexto (spinner inline vs. spinner em botão) — nomear como `.spinner` (16px, padrão) e `.spinner--on-dark` (20px, contraste), disponíveis nos dois frontends. |
| `.avatar` | Admin usa `display: grid`, PWA usa `display: flex` — mesmo resultado visual, implementação inconsistente. | Unificar em `flex` (compatibilidade mais ampla), mesmo token de tamanho (36px) e cor já coincidem. |
| `.empty-state` | Admin: `padding: 64px 32px`, sem elementos internos tipados. PWA: `padding: 56px 24px` + `h2` com estilo próprio. | **(Corrigido pelo princípio 1.1)** Adotar a estrutura **e o padding do PWA** como padrão único — o admin passa a usar `56px 24px` também. Padding maior é uma escolha de desktop; em mobile, espaço de tela é mais escasso e não deve ser sacrificado pra "uniformizar" com uma tela que sobra espaço. |
| `.attachment-item` / `.attachment-link` | Nomenclatura diferente para o mesmo papel — admin usa `.attachment-item` como container clicável; PWA separa `.attachment-item` (wrapper) de `.attachment-link` (o elemento clicável real). | Adotar o padrão do PWA (separação wrapper/link é mais correto semanticamente — permite metadados fora da área clicável). Migrar admin para a mesma estrutura. |
| `.attachment-list` | PWA usa `list-style: none` (é uma `<ul>`); admin não (é uacloseestruturado container). | Manter ambos — depende da tag HTML usada em cada tela, não é inconsistência visual. |
| `.badge-pinned` | Admin: `color: var(--navy-800)` + borda com `color-mix`. PWA: `color: var(--navy-700)`, sem borda. | Adotar a versão com borda nos dois. **Nota:** isso não fere o princípio 1.1 — a borda é adotada porque resolve uma confusão real na leitura do feed do PWA (ver linha abaixo), não porque "é a do admin". Validar visualmente no PWA antes de fechar, incluindo em telas pequenas. |
| `.badge-targeted` | Mesma cor de fundo que `.badge-pinned` nos dois frontends — os dois badges ficam visualmente idênticos hoje. | **Bug de design, não só duplicação:** precisa de uma cor própria para não confundir "fixado" com "direcionado a grupo". Sugestão: manter `--navy-100`/`--navy-700` para `.badge-targeted` e reservar a variante com borda (acima) exclusivamente para `.badge-pinned`. |
| `.badge-urgent` | Idêntico nos dois — nenhuma ação, só formalizar como token único. | Sem mudança de valor, mover para fonte compartilhada. |
| `.brand` | Admin: `gap: 12px` + padding lateral. PWA: `gap: 10px`, sem padding (não tem sidebar). | **(Corrigido pelo princípio 1.1)** Adotar `gap: 10px` do PWA como padrão do componente `.brand`; o admin mantém seu padding lateral próprio (isso é layout de sidebar, não do componente em si — não conflita com o princípio). |
| `.field` | Admin: wrapper simples de `label` + input externo. PWA: define `label` e `input` completos dentro da própria classe. | Adotar a implementação completa do PWA como o componente `.field` oficial (mais robusto: já cobre foco, erro/`aria-invalid`, placeholder) — admin passa a herdar em vez de reimplementar estilo de input em outro lugar. |
| `.field-error` | Praticamente idêntico; PWA adiciona `margin-top: 6px`. | Adotar a versão do PWA (mais completa). |
| `.attachment-meta`, `.attachment-name` | Diferença mínima (admin fixa `color` com fallback hex direto ao em vez de só a variável). | Unificar usando só a variável (`var(--text-primary)`, sem fallback hardcoded) — o fallback hex sugere que a variável podia não existir no momento em que foi escrito; hoje ela existe nos dois. |

---

## 4. Débito visual a sanear (projeto "Padrões visuais" — v1)

Trabalho único, não recorrente, pra zerar a divergência atual antes do
contrato valer daqui pra frente:

1. Decidir e ratificar a escala de espaçamento (Seção 2.8).
2. Renomear `--font` → `--font-family` no PWA.
3. Adicionar `--radius-pill` ao PWA (substituir literal `999px`).
4. Extrair `.btn` base compartilhado + modificadores de cor.
5. Resolver colisão visual `.badge-pinned` × `.badge-targeted`.
6. Unificar os 12 componentes listados na Seção 3.2 conforme a resolução
   proposta.
7. **Decisão de infraestrutura de CSS** (pré-requisito técnico): hoje cada
   frontend tem seu próprio `styles.css` sem compartilhamento de arquivo —
   tokens são mantidos sincronizados manualmente. Avaliar se compensa migrar
   os tokens (Seção 2, exceto 2.9) para um arquivo único importado pelos dois
   builds Vite, para que a duplicação estrutural pare de ser possível.

Cada item acima é uma unidade de trabalho pequena — recomendo tratá-los como
uma única issue de saneamento (ou poucas, agrupadas por área: tokens,
botões/badges, formulário/anexos), não 12 issues separadas, para não repetir
o problema de fragmentação que motivou este documento.
