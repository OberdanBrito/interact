# Arquitetura do Interact (PWA)

Convenção **feature-sliced** adotada em `src/`. Refatoração puramente estrutural:
arquivos movidos e imports ajustados, sem nenhuma mudança de comportamento,
de lógica ou de nomes de exports.

## Árvore de pastas

```
src/
├── app/                    # composição e bootstrap da aplicação
│   └── main.js             #   ponto de entrada: liga eventos, inicializa PWA e decide a view inicial
├── core/                   # utilidades puras e estado compartilhado, sem regra de negócio
│   ├── state.js            #   objeto de estado global (comentários "// dono:" indicam o slice responsável por cada campo)
│   └── utils.js            #   helpers puros: $, escapeHTML, storageGet/Set, relativeDate, initialsOf, STORAGE_KEYS, REDUCED_MOTION
├── data/                   # camada de dados
│   ├── posts.js            #   cliente da API REST: login, getPosts (com groupId), getPostById, interações, isPostVisibleToUser
│   ├── cache.js            #   cache offline em IndexedDB (Dexie): cachePosts, getCachedPosts, getCachedPost, clearCache
│   └── sync.js             #   fila offline de interações (interact.syncQueue) + reenvio no evento online
├── features/               # um assunto de negócio completo por pasta (lógica + view + templates dele)
│   ├── auth/
│   │   └── session.js      #   sessão do usuário: login, logout, restore, likes/leituras persistidos, badge
│   ├── feed/
│   │   ├── feed.js         #   feed: seletor de ambiente (grupos), chips de categoria, ordenação inteligente, renderização
│   │   ├── autoread.js     #   marcação automática de leitura por dwell/scroll no sheet
│   │   └── templates.js    #   templates HTML de post/comunicado (postCardHTML, actionButtonsHTML)
│   ├── interactions/
│   │   └── interactions.js #   ações sobre posts: curtir, confirmar leitura, delegação de cliques, sync da UI
│   ├── notifications/
│   │   └── badge.js        #   badge de não-lidos no ícone do app instalado (Badging API)
│   └── install/
│       └── pwa.js          #   registro do service worker + banner de instalação
└── ui/                     # componentes visuais genéricos, usados por 2+ features
    ├── sheet.js            #   bottom sheet: abrir/fechar, trap de foco
    └── toast.js            #   toast de feedback
```

## Tabela de decisão: onde colocar código novo

| Se o código é…                                          | Vai em…                |
| ------------------------------------------------------- | ---------------------- |
| Composição, bootstrap ou rotas/views                    | `app/`                 |
| Helper puro, sem regra de negócio                       | `core/`                |
| Busca ou persistência de dados                          | `data/`                |
| Assunto de negócio completo (lógica + view + templates) | `features/<assunto>/`  |
| Componente visual usado por 2+ features                 | `ui/`                  |

## Regras de crescimento

1. **Feature nova = pasta nova** em `features/<assunto>/`. Tudo que é exclusivo
   dela (lógica, templates, handlers) fica dentro da própria pasta.
2. **Subir para `ui/` só com reuso real**: um componente só migra de
   `features/<x>/` para `ui/` quando uma segunda feature passar a consumi-lo.
   Não promover por antecipação.
3. **`core/` permanece puro**: nada de regra de negócio, DOM de feature ou
   chamadas à camada de dados. Helpers aqui devem ser genéricos o bastante
   para qualquer slice usar.
4. **`app/` é o único lugar que conhece todas as features**: o bootstrap
   (`main.js`) importa e conecta os slices. Features não devem importar de
   `app/`.
5. **Templates pertencem à feature dona do conceito**: markup de comunicado
   vive em `features/feed/templates.js`. Só vai para `ui/` markup genérico e
   reutilizado (hoje não há nenhum — por isso não existe `ui/templates.js`;
   crie-o apenas quando surgir o primeiro template realmente compartilhado).

## Mapa dos arquivos atuais

| Pasta                        | Arquivos                                              |
| ---------------------------- | ----------------------------------------------------- |
| `app/`                       | `main.js`                                             |
| `core/`                      | `state.js`, `utils.js`                                |
| `data/`                      | `posts.js`, `cache.js`, `sync.js`                     |
| `features/auth/`             | `session.js`                                          |
| `features/feed/`             | `feed.js`, `autoread.js`, `templates.js`              |
| `features/interactions/`     | `interactions.js`                                     |
| `features/notifications/`    | `badge.js`                                            |
| `features/install/`          | `pwa.js`                                              |
| `ui/`                        | `sheet.js`, `toast.js`                                |

## Camada de dados: API real + cache offline

`src/data/posts.js` é o **cliente da API REST** do backend (login, `getPosts` com `?groupId`, `getPostById`, interações). Não há mais mock.

- **Cache offline (Dexie)** — `src/data/cache.js` abre o banco IndexedDB `interact-cache` (tabela `posts` chaveada por `id`). `getPosts` grava o lote no cache em sucesso e, offline, cai para `filterCachedByGroup` (replica a regra de visibilidade do backend: admin vê tudo; colaborador vê broadcast + direcionados aos seus grupos). `getPostByIdAsync` lê memória → IndexedDB para o bottom sheet offline. `clearCache` no logout (não vazar posts entre usuários).
- **Fila offline de interações** — `src/data/sync.js` enfileira curtidas/leituras em `interact.syncQueue` (localStorage) e reenvia ao backend no evento `online`. O estado local (`state.userData`) é a UI instantânea; o backend é a fonte de verdade do agregado.
- **Badge de não-lidos** — `src/features/notifications/badge.js` usa a Badging API (`navigator.setAppBadge`) para mostrar no ícone do app instalado a contagem de comunicados não lidos visíveis ao usuário. Atualizado no `renderFeed` e no `markReadPersist`; limpo no logout. No-op gracioso fora de PWA instalado.
- **Ordenação inteligente** — `sortFeed()` em `src/features/feed/feed.js`: urgentes primeiro, depois não-lidos, depois mais recentes (`dateISO` desc).
