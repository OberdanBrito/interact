## 1. Units systemd versionadas em deploy/poc/systemd/

- [x] 1.1 Criar `deploy/poc/systemd/interact-poc-backend.service` conforme design D2 (Type=simple, `EnvironmentFile` → `.env.poc`, WorkingDirectory → `backend/`, `Restart=on-failure`, `RestartSec=5`, `StartLimitIntervalSec=0`, `WantedBy=multi-user.target`)
- [x] 1.2 Criar `deploy/poc/systemd/interact-poc-caddy.service` conforme design D3 (After/Wants do backend, ExecStart apontando para o Caddyfile da POC, mesmo Restart)
- [x] 1.3 Validar sintaxe das units (`systemd-analyze verify <arquivos>`)

## 2. Restart policy do Mongo

- [x] 2.1 Adicionar `restart: unless-stopped` ao serviço `mongo` em `backend/docker-compose.yml`
- [x] 2.2 Reaplicar (`docker compose up -d`) e confirmar no container via `docker inspect backend-mongo-1 --format '{{.HostConfig.RestartPolicy.Name}}'` retornando `unless-stopped`

## 3. deploy.sh install/uninstall

- [x] 3.1 Adicionar subcomando `install` ao `deploy/poc/deploy.sh`: valida `.env.poc` existente, copia units para `/etc/systemd/system/` (via sudo), `daemon-reload`, `enable --now`, e detecta portas `:3003`/`:3005` ocupadas por instâncias manuais antes de habilitar
- [x] 3.2 Adicionar subcomando `uninstall`: `disable --now`, remove units, `daemon-reload`
- [x] 3.3 Ajustar `up` para não relaçar backend/caddy via nohup quando as units estão instaladas (assume serviço do systemd); manter compatibilidade sem units

## 4. Documentação e verificação

- [x] 4.1 Atualizar `deploy/poc/README-POC.md` com a seção de auto-start (units, `deploy.sh install`, ordem de boot, `journalctl` para diagnóstico, e nota de que o `tailscale serve` persiste no `tailscaled`)
- [x] 4.2 Teste real: sudo `deploy.sh install`, reboot do host, e verificar sem login: `systemctl is-active` das 2 units, `curl -sS https://obj.taild259e7.ts.net:8444/health` → ok, e abrir PWA/admin na URL tailnet
- [x] 4.3 Teste de rollback: `deploy.sh uninstall` + rever padrão manual (`deploy.sh up`)