# Demo POC "homeless" — Interact via Tailscale

Demo temporária e **single-tenant** do Interact para apresentação a decisores
(estágio de investimento/POC). É descartável: quando houver investimento, o
deploy real entra pela issue **#16 (Infra)** — VPS + domínio + wildcard por tenant.

## Premissas (decisões)

- **É uma demo, não produção.** Sem domínio, sem VPS, sem backup, sem CI/CD,
  sem monitoramento.
- **Single-tenant.** O backend roda com `NODE_ENV ≠ "production"` para o
  middleware de tenant cair no fallback `DEFAULT_TENANT_SLUG` (`interna`) em
  qualquer hostname — ver `backend/src/middleware/tenant.js:92`. Por isso NUNCA
  setar `NODE_ENV=production` nesta demo.
- **Só tailnet.** A demo é acessada por outro equipamento do dono na mesma
  tailnet (ex.: `loki`). Sem Funnel / internet pública.
- **Acesso pela URL:** `https://obj.taild259e7.ts.net:8444/` (PWA) e
  `/admin/` (painel). HTTPS via cert ts.net automático do Tailscale. O serviço
  "enfeitado" `svc:interact` (nome bonito) foi criado, mas a Tailscale exige
  aprovação de ACL para a máquina `obj` fazer service proxying (tag `postgresql-host`
  → aprovado por política, não por botão); para a demo usamos o serve no
  **hostname do próprio `obj`** na porta 8444, que não precisa de aprovação.
  `deploy.sh` parametriza com `POC_HOST`/`POC_SERVE_PORT` (defaults acima).

## Arquitetura

```
  outro equipamento (loki) na tailnet
        ▼  browser
  https://obj.taild259e7.ts.net:8444/    (TLS ts.net, só-rede)
        │  tailscale serve --https=8444 (hostname do obj)
        ▼
  ┌─ Caddy :3005 (host) ──────────────────────────────┐
  │  /health  → backend :3003                         │
  │  /admin/* → frontend_admin/dist (base /admin/)    │
  │  /api/*   → backend :3003 (flush_interval -1, SSE)│
  │  /uploads/* → backend :3003 (anexos I-03)         │
  │  /        → frontend_pwa/dist (scope "/" do PWA)  │
  └────────────────────────┬──────────────────────────┘
                           ▼
   backend node :3003 (instância única: scheduler + SSE)
                           ▼
   mongo backend-mongo-1 (docker) — DB nova `interact_poc` (seed)
```

## Como usar

```bash
# 1) env com segredos (nunca commitar)
cp .env.poc.example .env.poc
#    edite JWT_SECRET (openssl rand -hex 32) e
#    ENCRYPTION_KEY (node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# 2) montar a demo (builds + seed + backend + caddy + tailscale serve)
./deploy.sh up

# 3) conferir
./deploy.sh status           # health no endpoint tailnet
curl -sS https://obj.taild259e7.ts.net:8444/health

# 4) encerrar
./deploy.sh down
```

Pré-requisitos: `caddy` no PATH (host binary), `tailscale` logado, Mongo do
backend (`backend-mongo-1`) no ar — os mesmos já usados no desenvolvimento.

## Auto-start no boot (systemd)

A demo sobe sozinha quando o SO reinicia, sem ação do usuário. Três mecanismos:

1. **Mongo** — `restart: unless-stopped` no `backend/docker-compose.yml`: o
   container respawna junto do daemon do Docker (habilitado no boot).
2. **Backend + Caddy** — units versionadas em `deploy/poc/systemd/`:
   `interact-poc-backend.service` (:3003, lê `.env.poc` via `EnvironmentFile`,
   `Restart=on-failure`) e `interact-poc-caddy.service` (:3005, atrás do backend).
3. **Serve tailnet** — o `tailscale serve` da porta 8444 persiste no estado do
   `tailscaled` (já habilitado): volta sozinho ao boot, sem unit própria.

Instalar (uma vez):

```bash
sudo ./deploy.sh install   # copia units → /etc/systemd/system/, enable --now
```

Ordem no boot: `network → docker → mongo → backend → caddy`. Se o backend subir
antes do Mongo ficar pronto, o systemd reinicia (`Restart=on-failure`) até
estabilizar. Verificar:

```bash
./deploy.sh status            # units + listeners + health via URL tailnet
journalctl -u interact-poc-backend -f   # diagnóstico do backend
systemctl restart interact-poc-backend interact-poc-caddy
```

Remover (volta ao modo manual `./deploy.sh up`):

```bash
sudo ./deploy.sh uninstall
```

**Unidades versionadas, host reprodutível:** edite as units em
`deploy/poc/systemd/` (fonte de verdade) e rode `install` de novo — nunca edite
diretamente em `/etc/systemd/system/`.

## Dados da demo

Seed padrão (usuários de QA):
- Admin: `admin@interactcorp.com.br` / `senha123`
- Colaborador: `colaborador.operacoes@interactcorp.com.br` / `senha123`

Sugestão de roteiro: um admin publica um comunicado; do outro equipamento, o
PWA mostra chegando em ≤5s (SSE) e um agendado é liberado pelo scheduler.

**Nota (PWA × admin na mesma origem):** o service worker do PWA tem escopo `/`
e intercepta navegações — se você abrir o PWA primeiro e depois `/admin/` no
mesmo navegador, o SW pode devolver o app-shell do PWA no lugar do painel. Na
demo, abra o painel em guia anônima (ou primeiro `/admin/` e depois o PWA).
Em produção isso some: admin e PWA ficarão em origens/subdomínios separados.

## Migração futura

Nada aqui é reaproveitado em produção: VPS + domínio + wildcard serão montados
do zero na issue #16, seguindo a esteira OpenSpec. A única "dívida" herdada é
conceitual: o Caddy atrás de um terminal TLS já é o desenho do deploy real.