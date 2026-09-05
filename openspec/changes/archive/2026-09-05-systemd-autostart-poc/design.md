## Context

Hoje a stack da POC (`.poc` "homeless") sobe manualmente: `deploy/poc/deploy.sh up`
lança backend (`:3003`) e caddy (`:3005`) via `setsid nohup`, e o container do
Mongo (`backend/docker-compose.yml`) não tem restart policy (`no` por padrão). No
boot, apenas `docker`, `tailscaled` e o `caddy` genérico do host sobem sozinhos
(units existentes habilitadas). Se o host `obj` reiniciar, a demo fica inacessível
até o `deploy.sh up` rodar manualmente — falha para apresentação operacional.

O `tailscale serve` (https://obj.taild259e7.ts.net:8444 → localhost:3005) já
persiste solo: a configuração fica no estado do `tailscaled`, que retém o serve
entre reinícios do serviço. Não há unit própria necessária para o proxy tailnet.

## Goals / Non-Goals

**Goals:**
- Stack POC (Mongo + backend + caddy) sobe automaticamente no boot, sem login de usuário.
- Units versionadas no repositório (`deploy/poc/systemd/`) — o host é reprodutível.
- Gestão via `deploy.sh install`/`uninstall` (sudo), espelhando o estilo do script atual.
- Backend tolerante à ordem de subida no boot (Mongo pode demorar).

**Non-Goals:**
- Não tocar em código de runtime do Interact (backend/PWA/admin intocados).
- Não automatizar instâncias de desenvolvimento (`:3002` dev, `:5173`/`:5174`).
- Não resolver monitoramento/backups/uptime (produto da issue #16).
- Não migrar a demo para a infra de produção.

## Decisions

### D1. Mongo via restart policy no docker-compose (`unless-stopped`)
O `docker` já é serviço habilitado; o restart policy é o mecanismo nativo e mais
simples de respawnar o container junto do daemon. Uma linha no compose basta.
Novo container/volume existente respeitam `restart: unless-stopped` sem re-criar
(apenas `docker compose up -d` observa a política nova na próxima subida).

### D2. Backend como unit `interact-poc-backend.service` (Type=simple)
```ini
[Unit]
Description=Interact POC backend (API + scheduler + SSE + tenant)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/oberdan/WebstormProjects/interact/backend
EnvironmentFile=/home/oberdan/WebstormProjects/interact/deploy/poc/.env.poc
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=0

[Install]
WantedBy=multi-user.target
```
- **`EnvironmentFile`** reutiliza o `.env.poc` (formato `KEY=VALUE` já compatível;
  o arquivo é gitignorado e nunca sobe com segredos no repo — o unit aponta para
  o caminho no host).
- **`Restart=on-failure` + `StartLimitIntervalSec=0`**: se o Mongo ainda não
  respondeu, o server falha ao conectar e o systemd tenta de novo a cada 5s até
  estabilizar. `on-failure` (não `always`) evita mascarar crash por bug em loop.
- **`RestartSec=5`** dá ao Mongo uma folga típica de subida.
- **`WantedBy=multi-user.target`**: roda sem exigir login gráfico/texto.

### D3. Caddy como unit `interact-poc-caddy.service`
```ini
[Unit]
Description=Interact POC caddy (reverse proxy :3005)
After=interact-poc-backend.service network-online.target
Wants=interact-poc-backend.service

[Service]
Type=simple
ExecStart=/usr/bin/caddy run --config /home/oberdan/WebstormProjects/interact/deploy/poc/Caddyfile
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=0

[Install]
WantedBy=multi-user.target
```
O Caddyfile usa caminhos absolutos para os `dist` dos dois frontends — o serviço
roda qualquer `WorkingDirectory`. Se o backend ainda estiver subindo, o caddy
devolve 502 temporário até ficar pronto (não falha); `Restart=on-failure` cobre
erros de config/porta. Depois do `install`, a inicialização do proxy caddy deve
ser desligada (o `deploy.sh up` passa a assumir "já é unit"). O serve do
`tailscale` (8444 → :3005) permanece inalterado.

### D4. `deploy.sh install` / `uninstall`
- `install`: copia `deploy/poc/systemd/*.service` → `/etc/systemd/system/`,
  `daemon-reload`, `enable --now` (inicia já e habilita no boot), e imprime o
  status das duas units. Exige privilégio (usa `sudo`).
- `uninstall`: `disable --now`, remove os arquivos, `daemon-reload`.
- `up` passa a ser apenas para builds + seed + serve tailnet (não lança mais
  backend/caddy via nohup quando as units estão instaladas); mantém a compat se
  não houver units (dev), reportando adendo.

### D5. tailscale serve: nenhuma unit
O `tailscaled` (habilitado) restaura `serve` de `https://obj...:8444 → :3005` no
boot. Documentar no README-POC; `deploy.sh up` já o garante (`--bg`, idempotente).

## Risks / Trade-offs

- [Backend só deve depender de paths/ENV) → `EnvironmentFile` fixo aponta para o
  `.env.poc` do host; se mover/re-criar a demo, rodar `install` de novo.] →
  Mitigação: caminhos absolutos documentados no README-POC e no topo das units.
- [Restart em loop mascarando bug real] → `Restart=on-failure` + `StartLimitIntervalSec=0`
  pode mascarar crash contínuo; mitigado por `journalctl -u interact-poc-backend`
  para diagnóstico imediato e pela natureza descartável da demo (issue #16 sucede).
- [`EnvironmentFile` falhando por segredo ausente (`.env.poc` não commitado)]
  → `deploy.sh up` já exige `.env.poc`; `install` também deve validar a existência
  antes de habilitar (fail-fast).
- [Mudança no `docker-compose.yml` do backend afeta desenvolvimento] → `restart:
  unless-stopped` só altera comportamento no boot/daemon; dev local inalterado
  (comportamento desejável também).
- [Portas já ocupadas por instância manual (nohup) ao instalar] → `install` deve
  detectar `:3003`/`:3005` ocupados e avisar antes de habilitar (evita conflito de
  bind no próximo boot ou agora).

## Migration Plan

1. Aplicar D1 (`restart: unless-stopped` no compose) e recriar o container
   (`docker compose up -d`) para gravar a política.
2. Instalar units (D2/D3) via `deploy.sh install`.
3. Rebootar o host e validar: `systemctl status`, `/health` via URL tailnet,
   boot sem login. Repetir se necessário.
4. Rollback: `deploy.sh uninstall` + reverter o compose; o modo manual
   (`deploy.sh up`) continua funcionando.

## Open Questions

- Nenhuma pendente de negócio; decisões D2 com parametrização de paths ficam
  como constante documentada (host fixo `obj` da demo).