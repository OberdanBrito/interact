# Arquitetura — Interact Backend

Backend da plataforma Interact. API REST + PostgreSQL.

## Árvore de pastas

```
backend/
├── src/
│   ├── app.js              Express app (CORS, JSON body, rotas)
│   ├── server.js           Entry point — escuta na PORT
│   ├── db/
│   │   ├── pool.js         pg Pool (lê DATABASE_URL do dotenv)
│   │   ├── schema.sql      DDL: tabelas users + comunicados
│   │   └── seed.js         Popula banco com dados iniciais
│   ├── routes/
│   │   ├── index.js        Agregador de rotas (/api/*)
│   │   ├── auth.js         POST /api/auth/login → JWT
│   │   ├── posts.js        CRUD /api/posts (autenticado)
│   │   └── categories.js   GET /api/categories (autenticado)
│   └── middleware/
│       └── auth.js         Verifica JWT, injeta req.user
├── docker-compose.yml      Postgres 16 + volume persistente
├── .env                    Variáveis de ambiente (dev)
├── .env.example            Template para novos devs
└── package.json
```

## Regra de organização

| Se o código é...              | Vai em...                  |
|-------------------------------|----------------------------|
| Configuração do Express       | `src/app.js`               |
| Listen do servidor            | `src/server.js`            |
| Conexão com banco             | `src/db/pool.js`           |
| DDL (schema)                  | `src/db/schema.sql`        |
| Seed / dados iniciais         | `src/db/seed.js`           |
| Rota REST (CRUD)              | `src/routes/<recurso>.js`  |
| Middleware (auth, erros)      | `src/middleware/<nome>.js`  |
| Agregador de rotas            | `src/routes/index.js`      |

## Regras de crescimento

- **Novo recurso (ex: departamentos)** → criar `src/routes/departamentos.js`, registrar em `src/routes/index.js`
- **Nova tabela** → adicionar DDL em `src/db/schema.sql` (manter compatibilidade com tabelas existentes)
- **Nova migration** → criar arquivo `src/db/migrations/<data>_<descrição>.sql`, executar manualmente ou via script
- **Middleware novo** → criar em `src/middleware/`, importar no `app.js` ou na rota específica

## Decisões técnicas

- **Sem ORM** — SQL puro via `pg` (parameterized queries sempre). Motivo: transparência total com o banco, sem magia.
- **JWT via `jsonwebtoken`** — stateless, ideal para servir múltiplos frontends.
- **bcrypt** — hash de senhas com salt rounds 10.
- **Docker Compose** — Postgres isolado, reproduzível, volume persistente para não perder dados entre restarts.
- **IDs VARCHAR(10)** — compatibilidade direta com os IDs "p01", "p02" do frontend. Sem conversão necessária.
- **Porta 3002** — porta 3000 e 3001 já estavam em uso no dev local.

## Schema — users

| Coluna        | Tipo           | Restrição        |
|---------------|----------------|------------------|
| id            | SERIAL         | PK               |
| email         | VARCHAR(255)   | UNIQUE NOT NULL  |
| password_hash | VARCHAR(255)   | NOT NULL         |
| name          | VARCHAR(255)   | NOT NULL         |
| role          | VARCHAR(100)   |                  |
| created_at    | TIMESTAMPTZ    | DEFAULT NOW()    |

## Schema — comunicados

| Coluna       | Tipo           | Restrição              |
|--------------|----------------|------------------------|
| id           | VARCHAR(10)    | PK (p01, p02, ...)     |
| read_mode    | VARCHAR(10)    | NOT NULL, DEFAULT 'auto'|
| category_id  | VARCHAR(50)    | NOT NULL               |
| urgent       | BOOLEAN        | DEFAULT FALSE          |
| like_base    | INT            | DEFAULT 0              |
| title        | VARCHAR(500)   | NOT NULL               |
| body         | TEXT[]         | NOT NULL, DEFAULT '{}' |
| author_name  | VARCHAR(255)   |                        |
| author_role  | VARCHAR(100)   |                        |
| date_iso     | TIMESTAMPTZ    | DEFAULT NOW()          |
| created_at   | TIMESTAMPTZ    | DEFAULT NOW()          |
| updated_at   | TIMESTAMPTZ    | DEFAULT NOW()          |

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

| Variável      | Default                                        | Descrição        |
|---------------|------------------------------------------------|------------------|
| DATABASE_URL  | postgresql://interact:interact@localhost:5432/interact | Conexão PG  |
| JWT_SECRET    | interact-dev-secret                            | Chave JWT (dev)  |
| PORT          | 3002                                           | Porta do Express |

## Comandos

```bash
npm install          # Instala dependências
docker compose up -d # Sobe Postgres
npm run seed         # Popula banco (idempotente)
npm run dev          # Inicia em dev mode (hot-reload via --watch)
npm start            # Production mode
npm run db:reset     # Destrói volume, sobe Postgres do zero, re-seeda
```
