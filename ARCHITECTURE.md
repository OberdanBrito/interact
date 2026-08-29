# Arquitetura — Interact Backend

Backend da plataforma Interact. API REST + MongoDB (Mongoose).

## Árvore de pastas

```
backend/
├── src/
│   ├── app.js              Express app (CORS, JSON body, rotas)
│   ├── server.js           Entry point — conecta no Mongo e escuta na PORT
│   ├── db/
│   │   ├── connection.js   Conexão Mongoose única (lê MONGODB_URI do dotenv)
│   │   └── seed.js         Apaga coleções e popula com dados iniciais
│   ├── models/
│   │   ├── User.js         Schema Mongoose de usuários (groupIds, role)
│   │   ├── Comunicado.js   Schema Mongoose de comunicados (_id "p01", ...; targetGroups, createdBy)
│   │   ├── Group.js        Schema Mongoose de grupos (name, active)
│   │   └── Interaction.js  Schema Mongoose de interações (postId, userId, liked, read)
│   ├── routes/
│   │   ├── index.js        Agregador de rotas (/api/*)
│   │   ├── auth.js         POST /api/auth/login → JWT
│   │   ├── posts.js        CRUD /api/posts (admin para POST/PUT/DELETE; filtro por grupo)
│   │   ├── groups.js       CRUD /api/groups (admin) + recipient-count
│   │   ├── interactions.js PUT/GET /api/interactions (sync colaborador + métricas admin)
│   │   └── categories.js   GET /api/categories (autenticado)
│   └── middleware/
│       ├── auth.js         Verifica JWT, injeta req.user (com groupIds frescos do banco)
│       └── requireAdmin.js Rejeita 403 se req.user.role !== "admin"
├── docker-compose.yml      Mongo 7 + volume persistente
├── .env                    Variáveis de ambiente (dev)
├── .env.example            Template para novos devs
└── package.json
```

## Regra de organização

| Se o código é...              | Vai em...                  |
|-------------------------------|----------------------------|
| Configuração do Express       | `src/app.js`               |
| Listen do servidor            | `src/server.js`            |
| Conexão com banco             | `src/db/connection.js`     |
| Schema do banco               | `src/models/<Model>.js`    |
| Seed / dados iniciais         | `src/db/seed.js`           |
| Rota REST (CRUD)              | `src/routes/<recurso>.js`  |
| Middleware (auth, erros)      | `src/middleware/<nome>.js`  |
| Agregador de rotas            | `src/routes/index.js`      |

## Regras de crescimento

- **Novo recurso (ex: departamentos)** → criar `src/routes/departamentos.js`, registrar em `src/routes/index.js`
- **Nova coleção** → criar schema em `src/models/<Nome>.js` e importar onde for usado
- **Mudança de schema** → ajustar o model Mongoose (schemaless: docs antigos sem o campo retornam `undefined`; avaliar migração de dados se necessário)
- **Middleware novo** → criar em `src/middleware/`, importar no `app.js` ou na rota específica
- **Rota admin-only** → proteger com `auth` + `requireAdmin` (ex.: groups, recipient-count, métricas, escrita de posts)

## Decisões técnicas

- **Mongoose** — ODM oficial do MongoDB: schemas com validação, defaults e timestamps automáticos. Leituras usam `.lean()` (POJO, sem overhead de Document).
- **JWT via `jsonwebtoken`** — stateless, ideal para servir múltiplos frontends.
- **bcrypt** — hash de senhas com salt rounds 10.
- **Docker Compose** — Mongo isolado, reproduzível, volume persistente para não perder dados entre restarts.
- **IDs string ("p01", "p02", ...)** — `_id` customizado dos comunicados (compatibilidade direta com os IDs do frontend). **Users, groups e interactions usam ObjectId**; `targetGroups`/`groupIds` guardam `Group._id` como string (renomear grupo é seguro — referências por id, não por nome).
- **Porta 3002** — porta 3000 e 3001 já estavam em uso no dev local.
- **Visibilidade por grupo** — `targetGroups: []` = broadcast (todos os colaboradores); preenchido = exclusivo (união dos grupos). Admin vê apenas o que publicou (`createdBy`). `GET /:id` retorna 404 (não 403) para não revelar existência.
- **`requireAdmin`** — middleware para rotas admin-only (groups, recipient-count, métricas, POST/PUT/DELETE de posts). Colaborador recebe 403.
- **Interações** — um documento por (comunicado, usuário), índice único `{ postId, userId }`. Colaborador sincroniza via PUT (upsert); admin consulta agregados.

## Schema — users (coleção `users`)

| Campo          | Tipo     | Restrição                    |
|----------------|----------|------------------------------|
| _id            | ObjectId | PK (gerado pelo Mongo)       |
| email          | String   | unique, lowercase, required  |
| password_hash  | String   | required                     |
| name           | String   | required                     |
| role           | String   | "admin" \| "colaborador"     |
| groupIds       | [String] | default [] — `Group._id` como string |
| createdAt      | Date     | automático (timestamps)      |
| updatedAt      | Date     | automático (timestamps)      |

## Schema — comunicados (coleção `comunicados`)

| Campo         | Tipo     | Restrição                     |
|---------------|----------|-------------------------------|
| _id           | String   | PK custom (p01, p02, ...)     |
| readMode      | String   | enum 'auto'\|'ack', default 'auto' |
| categoryId    | String   | required                      |
| urgent        | Boolean  | default false                 |
| likeBase      | Number   | default 0                     |
| title         | String   | required                      |
| body          | [String] | default []                    |
| author.name   | String   | default null                  |
| author.role   | String   | default null                  |
| targetGroups  | [String] | default [] — `Group._id` como string; `[]` = broadcast |
| createdBy     | ObjectId | ref User, default null — admin que publicou |
| dateISO       | Date     | default now                   |
| createdAt     | Date     | automático (timestamps)       |
| updatedAt     | Date     | automático (timestamps)       |

Obs.: a API expõe `id` (não `_id`) e `dateISO` serializado como string ISO — a camada de rotas faz esse mapeamento. `toPost` também resolve `targetGroupNames` (nomes dos grupos-alvo).

## Schema — groups (coleção `groups`)

| Campo     | Tipo    | Restrição                    |
|-----------|---------|------------------------------|
| _id       | ObjectId| PK (gerado pelo Mongo)       |
| name      | String  | required, unique             |
| active    | Boolean | default true — inativo não pode ser alvo de post novo |
| createdAt | Date    | automático (timestamps)      |
| updatedAt | Date    | automático (timestamps)      |

## Schema — interactions (coleção `interactions`)

| Campo     | Tipo     | Restrição                          |
|-----------|----------|------------------------------------|
| _id       | ObjectId | PK (gerado pelo Mongo)             |
| postId    | String   | required — id do comunicado        |
| userId    | ObjectId | ref User, required                 |
| liked     | Boolean  | default false                      |
| read      | Boolean  | default false                      |
| readAt    | Date     | default null — preenchido na transição p/ lido |
| likedAt   | Date     | default null — preenchido na transição p/ curtido |
| createdAt | Date     | automático (timestamps)            |
| updatedAt | Date     | automático (timestamps)            |

Índice único `{ postId, userId }` — um documento por (comunicado, usuário), fonte única da interação.

## Endpoints

| Método | Rota                 | Auth  | Descrição                         |
|--------|----------------------|-------|-----------------------------------|
| POST   | /api/auth/login      | Não   | Login → JWT + user (com groupIds e groups ativos) |
| GET    | /api/posts           | Sim   | Lista comunicados (filtro por visibilidade; `?groupId=X` por ambiente) |
| GET    | /api/posts/:id       | Sim   | Detalhe de comunicado (404 se não elegível) |
| POST   | /api/posts           | Admin | Cria comunicado (targetGroups; createdBy do token) |
| PUT    | /api/posts/:id       | Admin | Edita comunicado (targetGroups imutável → 400) |
| DELETE | /api/posts/:id       | Admin | Exclui comunicado (204)           |
| GET    | /api/categories      | Sim   | Lista categorias                  |
| GET    | /api/groups          | Admin | Lista grupos                      |
| POST   | /api/groups          | Admin | Cria grupo (nome vazio 400; duplicado 400) |
| PUT    | /api/groups/:id      | Admin | Edita nome/ativo                  |
| DELETE | /api/groups/:id      | Admin | **405** — sem hard delete; desativar via PUT |
| POST   | /api/groups/recipient-count | Admin | Body `{ targetGroups }` → `{ count }` (união distinta; `[]` = total de colaboradores) |
| PUT    | /api/interactions/:postId | Sim | Colaborador sincroniza `{ liked?, read? }` (upsert) |
| GET    | /api/interactions/me | Sim   | Estado do usuário em todos os posts |
| GET    | /api/interactions/:postId | Sim | Colaborador: próprio estado; admin: agregado |
| GET    | /api/interactions?postId= | Admin | Agregado (total e por grupo) |
| GET    | /api/interactions/members?postId= | Admin | Lista quem leu/curtiu (com nome, email, grupos) |
| GET    | /api/interactions/summary | Admin | Métricas de todos os posts em uma chamada |
| GET    | /health              | Não   | Health check                      |

## Variáveis de ambiente

| Variável      | Default                                                            | Descrição        |
|---------------|-------------------------------------------------------------------|------------------|
| MONGODB_URI   | mongodb://interact:interact@localhost:27017/interact?authSource=admin | Conexão Mongo |
| JWT_SECRET    | interact-dev-secret                                               | Chave JWT (dev)  |
| PORT          | 3002                                                              | Porta do Express |

## Comandos

```bash
npm install          # Instala dependências
docker compose up -d # Sobe MongoDB
npm run seed         # Reseta coleções e popula banco
npm run dev          # Inicia em dev mode (hot-reload via --watch)
npm start            # Production mode
npm run db:reset     # Destrói volume, sobe Mongo do zero, re-seeda
```
