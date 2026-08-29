# Interact — Design System

App PWA mobile-first para comunicação interna entre empresa e colaboradores.
Tema **claro apenas**, identidade em **azul marinho corporativo**. Stack: HTML/CSS/JS puro, organizado em ES Modules com build via **Vite** + **vite-plugin-pwa** (Workbox).

## 0. Research Log

- **Skill reference library** (`references/design/*`, `perfection/*`, `designpowers/*`): **SKIP — não instalada neste ambiente.** Princípios do router aplicados manualmente (Design System Gate, tokens-first, SVG icons only, GPU-composited motion, mobile QA).
- **Direção visual**: produto operacional de alta qualidade (restraint estilo Linear/Notion) adaptado a padrões de app mobile nativo (bottom sheets, chips, cards). Nenhuma referência concreta fornecida pelo usuário → tokens definidos abaixo são o contrato.
- **Paleta**: azul marinho como cor de marca e superfícies primárias; categorias com cores funcionais dessaturadas (corporativo, não lúdico).

## 1. Identidade

| Propriedade | Valor |
|---|---|
| Nome do app | Interact |
| Empresa fictícia | Interact Corp |
| Tagline | Comunicação interna |
| Ícone | Letra "I" branca sobre losango/campo azul marinho, cantos arredondados |
| Idioma da UI | pt-BR |

## 2. Cores (tokens)

### Marca
| Token | Valor | Uso |
|---|---|---|
| `--navy-900` | `#0B1F3A` | Texto sobre superfícies claras mais forte; fundo splash |
| `--navy-800` | `#0F2B52` | **Primária.** Header, botões primários, tema do manifest |
| `--navy-700` | `#16375F` | Hover/pressed de primários |
| `--navy-600` | `#1E4A7A` | Links, ícones ativos |
| `--navy-500` | `#2D5C96` | Elementos interativos secundários |
| `--navy-100` | `#DCE7F5` | Tint de fundo (chips ativos, hovers suaves) |
| `--navy-050` | `#F0F5FB` | Tint mais claro (badges de fundo) |

### Neutros / superfícies
| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#F4F7FB` | Fundo do app |
| `--surface` | `#FFFFFF` | Cards, sheets, inputs |
| `--text-primary` | `#16233A` | Títulos e corpo |
| `--text-secondary` | `#5A6B85` | Metadados, placeholders |
| `--border` | `#E3EAF3` | Divisores, bordas de input |
| `--shadow-card` | `0 1px 2px rgba(11,31,58,.06), 0 4px 16px rgba(11,31,58,.08)` | Elevação de card |

### Semânticas
| Token | Valor | Uso |
|---|---|---|
| `--success` | `#15803D` / bg `#DCFCE7` | Leitura confirmada |
| `--danger` | `#DC2626` / bg `#FEE2E2` | Erro de login, urgente |
| `--warning-bg` | `#FEF3C7` | Selo "Importante" |

### Categorias (badge: texto na cor, fundo no tint 10%)
| Categoria | Cor |
|---|---|
| Geral | `#2D5C96` |
| RH | `#0E9384` |
| TI | `#6E56CF` |
| Benefícios | `#B45309` |
| Urgente (selo transversal) | `--danger` |

Contraste mínimo AA (4.5:1) para todo texto sobre `--surface` e `--bg`.

## 3. Tipografia

| Token | Valor |
|---|---|
| Família | `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (Inter via Google Fonts, `display=swap`) |
| `--fs-display` | 28px / 700 — título de boas-vindas no login |
| `--fs-title` | 20px / 700 — título de card, nome da tela |
| `--fs-body` | 15px / 400, line-height 1.55 — corpo de posts |
| `--fs-meta` | 13px / 500 — autor, data, contadores |
| `--fs-label` | 12px / 600, letter-spacing .04em uppercase — badges, overline |
| `--fs-input` | 16px — inputs (evita zoom iOS) |

## 4. Espaçamento & forma

- Escala base **4px**: 4 · 8 · 12 · 16 · 20 · 24 · 32
- Padding de tela: 16px lateral; gutter de lista: 12px vertical entre cards
- Raio: `--radius-sm` 10px (inputs), `--radius-md` 14px (cards), `--radius-lg` 22px (bottom sheet topo), `--radius-pill` 999px (chips/botões)
- Botão primário: altura 48px; chip filtro: 36px
- Safe areas: respeitar `env(safe-area-inset-bottom)` na tab bar/sheet

## 5. Componentes primitivos

1. **TextField** — label acima, input 48px, borda `--border`, foco: borda `--navy-800` + ring `--navy-100`; erro: borda `--danger` + mensagem 13px.
2. **Button primary** — fundo `--navy-800`, texto branco, raio pill, pressed: escala .98 + `--navy-700`. Disabled: opacidade .5.
3. **CategoryChip** — pill 36px; inativo: fundo `--surface`, borda `--border`; ativo: fundo `--navy-800`, texto branco. Scroll horizontal sem barra visível.
4. **PostCard** — `--surface`, raio md, shadow card; header do card: **dot de não-lido** (some ao ler), badge categoria, selo urgente (se houver) e data à direita; título fs-title; corpo clampado a 3 linhas (`line-clamp`); footer: autor+avatar inicial, botões Curtir (coração outline→preenchido) e — somente em posts `readMode: "ack"` — Confirmar leitura (check).
5. **BottomSheet (detalhe do post)** — overlay rgba(11,31,58,.45); sheet raio-lg topo, arrastável por handle; corpo completo, ações no rodapé fixo.
6. **Toast** — feedback pós-ação ("Leitura confirmada"), fundo `--navy-900`, entra por baixo, some em 2.4s.
7. **EmptyState** — ilustração SVG simples + texto, quando filtro não tem posts.
8. **InstallBanner** — barra inferior discreta com botão "Instalar app" (quando `beforeinstallprompt` dispara).

Estados obrigatórios: default, hover (desktop), active/pressed, focus-visible (ring `--navy-100` 2px offset), disabled, loading (spinner no botão de login).

### Marcação de leitura (dois modos)

| Modo | Posts | Como marca | Feedback |
|---|---|---|---|
| `auto` (padrão) | Comunicados informativos | Automática: ~3s de permanência no sheet **ou** scroll até o fim do texto; se o texto cabe inteiro na tela, marca na abertura | Silenciosa: dot de não-lido desaparece |
| `ack` | Comunicados que exigem ciência formal (urgentes, normas) | Botão "Confirmar leitura" explícito | Estado verde + toast |

Dot de não-lido: 8px, círculo `--navy-600`, à esquerda do badge de categoria; aplica-se a ambos os modos enquanto não lido.

## 6. Motion (GPU-only)

| Token | Valor | Uso |
|---|---|---|
| `--dur-fast` | 140ms | Pressed states, toggles |
| `--dur-med` | 220ms | Sheet slide-up/down, toast |
| `--ease-out` | `cubic-bezier(.22,.61,.36,1)` | Entradas |
| `--ease-spring` | `cubic-bezier(.34,1.3,.64,1)` | Curtida (pop do coração, escala 1→1.25→1) |

Regras: animar **apenas** `transform` e `opacity`; sheet usa `translateY`, curtida usa `scale`; `prefers-reduced-motion: reduce` desliga todas as transições. Nenhuma animação decorativa sem função de feedback.

## 7. Acessibilidade

- Alvos de toque ≥ 44×44px
- `focus-visible` sempre estilizado (navegação por teclado funcional)
- Contraste AA; badges nunca só por cor (texto legível sempre)
- `aria-live="polite"` no feed para novos posts/toasts; `role="dialog"` + foco preso no sheet; `Esc` fecha
- Inputs com `<label>` associado; erros anunciados via `aria-describedby`

## 8. PWA

| Item | Valor |
|---|---|
| `theme_color` | `#0F2B52` |
| `background_color` | `#F4F7FB` |
| `display` | `standalone`, orientação portrait |
| Ícones | 192, 512, maskable-512 (padding seguro 20%), apple-touch 180 |
| Splash | Fundo `--navy-900`? Não — fundo `#FFFFFF`, logo centralizado (iOS usa apple-touch-startup-image nativo se presente; fallback: tela branca + ícone) |
| Service worker | Gerado pelo Workbox (`generateSW`): precache de todo o shell com filenames revisados; navegação cai em `index.html`; atualização automática (`autoUpdate`) com limpeza de caches obsoletos |
| Instalação | Banner custom capturando `beforeinstallprompt`; iOS: instruções "Compartilhar → Adicionar à Tela de Início" detectadas por user agent |

### Organização do código

```
index.html            entrada do Vite
public/               copiado tal qual ao build (ícones, favicon)
src/
  app/main.js         boot e wiring de eventos (composition root)
  core/state.js       estado único; cada campo tem um módulo dono documentado
  core/utils.js       helpers ($, escapeHTML, datas, iniciais, storage)
  data/posts.js       cliente da API REST (login, posts com groupId, interações)
  data/cache.js       cache offline em IndexedDB (Dexie) — posts para leitura sem conexão
  data/sync.js        fila offline de interações (reenvio no evento online)
  features/auth/session.js   sessão e persistência por usuário (dono de user/userData)
  features/feed/feed.js      seletor de ambiente, chips, ordenação inteligente, renderização
  features/feed/autoread.js  marcação automática: abertura instantânea, dwell 3s, scroll
  features/feed/templates.js templates HTML de card e ações
  features/interactions/interactions.js  curtir/confirmar leitura/sync de UI + bindActionContainer()
  features/notifications/badge.js  badge de não-lidos no ícone do app (Badging API)
  features/install/pwa.js   banner de instalação + registro do service worker
  ui/sheet.js         bottom sheet: abertura, fechamento (guard anti-race), focus trap
  ui/toast.js         feedback efêmero
scripts/
  gen_icons.py        gera os ícones PNG sem dependências externas
  qa-pwa.mjs          QA automatizado end-to-end (npm run qa; requer preview ativo)
  qa-offline-cache.mjs / qa-offline-collab.mjs / qa-badge-sort.mjs  QA focados
```

## 9. Dívidas aceitas (v1)

- Sem modo escuro (decisão do usuário)
- Sem comentários (fora do escopo v1)
- Badge de não-lidos só funciona em PWA instalado (Chromium); no navegador é no-op gracioso
- Notificação push adiada (depende de servidores externos — decisão do usuário)

## 10. Resolvido

- ~~Sem hash de assets: bump manual de `CACHE_NAME` a cada release~~ → build Vite com filenames revisados; Workbox versiona o precache e limpa caches obsoletos automaticamente (`cleanupOutdatedCaches`)
