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
│   │   ├── User.js         Schema Mongoose de usuários
│   │   └── Comunicado.js   Schema Mongoose de comunicados (_id "p01", ...)
│   ├── routes/
│   │   ├── index.js        Agregador de rotas (/api/*)
│   │   ├── auth.js         POST /api/auth/login → JWT
│   │   ├── posts.js        CRUD /api/posts (autenticado)
│   │   └── categories.js   GET /api/categories (autenticado)
│   └── middleware/
│       └── auth.js         Verifica JWT, injeta req.user
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

## Decisões técnicas

- **Mongoose** — ODM oficial do MongoDB: schemas com validação, defaults e timestamps automáticos. Leituras usam `.lean()` (POJO, sem overhead de Document).
- **JWT via `jsonwebtoken`** — stateless, ideal para servir múltiplos frontends.
- **bcrypt** — hash de senhas com salt rounds 10.
- **Docker Compose** — Mongo isolado, reproduzível, volume persistente para não perder dados entre restarts.
- **IDs string ("p01", "p02", ...)** — `_id` customizado (não ObjectId), compatibilidade direta com os IDs do frontend. Sem conversão necessária.
- **Porta 3002** — porta 3000 e 3001 já estavam em uso no dev local.

## Schema — users (coleção `users`)

| Campo          | Tipo     | Restrição                    |
|----------------|----------|------------------------------|
| _id            | ObjectId | PK (gerado pelo Mongo)       |
| email          | String   | unique, lowercase, required  |
| password_hash  | String   | required                     |
| name           | String   | required                     |
| role           | String   |                              |
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
| dateISO       | Date     | default now                   |
| createdAt     | Date     | automático (timestamps)       |
| updatedAt     | Date     | automático (timestamps)       |

Obs.: a API expõe `id` (não `_id`) e `dateISO` serializado como string ISO — a camada de rotas faz esse mapeamento.

## Endpoints

| Método | Rota                 | Auth  | Descrição                         |
|--------|----------------------|-------|-----------------------------------|
| POST   | /api/auth/login      | Não   | Login → retorna JWT + dados user  |
| GET    | /api/posts           | Sim   | Lista comunicados (filtro opcional)|
| GET    | /api/posts/:id       | Sim   | Detalhe de comunicado             |
| POST   | /api/posts           | Sim   | Cria comunicado                   |
| PUT    | /api/posts/:id       | Sim   | Edita comunicado (body parcial)   |
| DELETE | /api/posts/:id       | Sim   | Exclui comunicado (204)           |
| GET    | /api/categories      | Sim   | Lista categorias                  |
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
