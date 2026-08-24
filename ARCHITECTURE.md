# Arquitetura do Interact Admin

Convenção **feature-sliced** para organização do `src/`. O objetivo é que cada
arquivo tenha um lugar óbvio e que o crescimento do projeto não gere uma pasta
cheia de módulos soltos na raiz.

## Árvore de pastas

```
src/
├── app/        Composição e bootstrap da aplicação: ponto de entrada e rotas.
├── core/       Helpers puros, sem regra de negócio: estado central e utilitários.
├── data/       Busca e persistência de dados (camada de acesso a dados).
├── features/   Assuntos de negócio completos: lógica + view + templates do assunto.
│   ├── auth/       Autenticação: sessão e tela de login.
│   └── posts/      Comunicados: listagem e formulário de publicação.
└── ui/         Componentes visuais genéricos usados por 2+ features.
```

| Pasta | Propósito |
|---|---|
| `app/` | Composição/bootstrap/rotas — o que liga tudo. |
| `core/` | Helper puro, sem negócio — não importa de `data/`, `features/` ou `ui/`. |
| `data/` | Busca ou persistência de dados — único lugar que fala com a fonte de dados. |
| `features/<assunto>/` | Assunto de negócio completo (lógica + view + templates dele). |
| `ui/` | Componente visual usado por 2+ features. |

## Se o código é X → vai em Y

| Se o código é… | …vai em |
|---|---|
| Composição, bootstrap ou definição de rotas | `app/` |
| Helper puro, sem regra de negócio | `core/` |
| Busca ou persistência de dados | `data/` |
| Assunto de negócio completo (lógica + view + templates dele) | `features/<assunto>/` |
| Componente visual usado por 2+ features | `ui/` |

## Regras de crescimento

1. **Feature nova = pasta nova em `features/`.** Tudo que é exclusivo do assunto
   (view, lógica, templates, validações) fica dentro da pasta dele.
2. **Subir para `ui/` só quando houver reuso real.** Um componente só sai de
   `features/<assunto>/` para `ui/` quando uma segunda feature de fato o utiliza —
   nunca por antecipação.
3. `core/` permanece pequeno e sem dependências internas do projeto.
4. `app/` não contém regra de negócio — apenas monta o app e mapeia rotas para
   as views das features.

## Mapa dos arquivos atuais

| Arquivo | Pasta |
|---|---|
| `main.js` (ponto de entrada) | `app/main.js` |
| `router.js` (rotas hash) | `app/router.js` |
| `state.js` (estado central, slices com `// dono:`) | `core/state.js` |
| `utils.js` (storage, datas, texto, `$`) | `core/utils.js` |
| `posts.js` (camada de dados de comunicados) | `data/posts.js` |
| `toast.js` (notificações) | `ui/toast.js` |
| `templates.js` (shell, badges, modal — genéricos) | `ui/templates.js` |
| `session.js` (sessão do usuário) | `features/auth/session.js` |
| `login-view.js` (tela de login) | `features/auth/login-view.js` |
| `list-view.js` (listagem de comunicados) | `features/posts/list-view.js` |
| `form-view.js` (criação/edição de comunicado) | `features/posts/form-view.js` |

## Aviso: `data/posts.js` é uma camada mock isolada

`data/posts.js` persiste em **localStorage** e simula latência. É uma camada de
dados **deliberadamente isolada** com **assinaturas estáveis**
(`listPosts`, `getPost`, `createPost`, `updatePost`, `deletePost`, `CATEGORIES`)
para permitir a **troca futura por uma API real sem tocar em nenhuma feature**.
Ao fazer essa troca, substitua apenas a implementação dentro de `data/` —
não altere as assinaturas exportadas.
