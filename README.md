# Interact

Plataforma de comunicação interna entre empresa e colaboradores (comunicação
unidirecional: empresa → colaborador).

## Estrutura do repositório

| Branch | Conteúdo |
|---|---|
| `main` | **Documentação** (este branch): `AGENTS.md` (base de conhecimento) e `ISSUES.md` (controle de implementação) |
| `backend` | API REST + MongoDB (Express 5, Mongoose, JWT) |
| `frontend_admin` | Painel administrativo (Vite vanilla JS) |
| `frontend_pwa` | PWA do colaborador (Vite + vite-plugin-pwa) |

## Documentação

- **`AGENTS.md`** — base de conhecimento do sistema: arquitetura, fluxo de dados, convenções, anti-padrões.
- **`ISSUES.md`** — controle de implementação: lacunas do produto com prioridade, esforço e critérios de aceite. As issues acionáveis também estão registradas nas [issues do GitHub](https://github.com/OberdanBrito/interact/issues).

## Issues

O acompanhamento de implementação é feito via [GitHub Issues](https://github.com/OberdanBrito/interact/issues), com labels de prioridade (`prioridade: alta|media|baixa`) e área (`area: publicacao|entrega|leitura|metricas`).