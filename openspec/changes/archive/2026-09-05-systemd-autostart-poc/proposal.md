## Why

A POC atual exige ação manual do usuário para subir: backend e caddy são lançados
via `nohup` pelo `deploy.sh` e o container do Mongo tem `restart: no`. Se a
máquina `obj` (servidor da demo) reiniciar, a aplicação fica fora do ar até
alguém rodar o deploy manualmente — inaceitável para uma apresentação operacional
a decisores. O objetivo: com o boot do sistema operacional, toda a stack da POC
(Mongo + backend + caddy) sobe sozinha e fica acessível, sem nenhuma ação humana.

## What Changes

- Adiciona `restart: unless-stopped` ao serviço `mongo` do `backend/docker-compose.yml`:
  o banco respawna junto do Docker no boot.
- Cria units systemd versionadas em `deploy/poc/systemd/`:
  - `interact-poc-backend.service` — backend API :3003 (scheduler + SSE + tenant),
    com `EnvironmentFile` apontando para `.env.poc`, `Restart=on-failure` e lógica
    de espera pelo Mongo.
  - `interact-poc-caddy.service` — caddy reverse proxy :3005, atrás do backend.
- Estende `deploy/poc/deploy.sh` com subcomando `install` (instala/copia as units em
  `/etc/systemd/system/`, `daemon-reload` e `enable --now`) e `uninstall`.
- Documenta que o `tailscale serve` da porta 8444 já persiste sozinho (estado do
  `tailscaled`), não exigindo unit.
- Ordem no boot: `network → docker → mongo → backend → caddy`; acesso pela URL
  ts.net só quando a stack estiver de pé.

## Capabilities

### New Capabilities
- `boot-autostart-poc`: a stack operacional da POC sobe automaticamente no boot
  do SO, sem ação do usuário, e responde após reinício.

### Modified Capabilities

## Impact

- `backend/docker-compose.yml` — uma linha (`restart: unless-stopped` no `mongo`),
  afeta o container de desenvolvimento (mesmo docker-compose) de forma benigna.
- `deploy/poc/systemd/` — novos arquivos de unit (3 no total: backend, caddy e um
  drop-in/template opcional de documentação).
- `deploy/poc/deploy.sh` — novos subcomandos `install`/`uninstall`.
- Host `obj` (Sistemas Linux): requer `systemctl`/`sudo` para instalação das units.
- Sem mudança em código de runtime do Interact (backend/PWA/admin intocados).