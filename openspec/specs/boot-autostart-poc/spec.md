# Boot Autostart POC

## Purpose

Garantir que toda a stack da demo POC ("homeless", deploy/poc/) suba automaticamente
no boot do sistema operacional, sem ação manual do usuário: container Mongo via
restart policy, backend e Caddy via units systemd versionadas, e exposição pela rede
tailnet persistente. Corresponde à mudança `systemd-autostart-poc` (boot autostart
da POC).

## Requirements

### Requirement: Banco Mongo sobe automaticamente no boot
O container `mongo` do backend (`backend/docker-compose.yml`) SHALL ter política de
reinício `unless-stopped`, de forma que ele volte sozinho quando o daemon do
Docker iniciar no boot do sistema operacional.

#### Scenario: SO reinicia com Docker ativo
- **WHEN** o sistema operacional reinicia e o serviço `docker` inicia
- **THEN** o container `backend-mongo-1` é criado/iniciado automaticamente pelo restart policy
- **THEN** o Mongo fica saudável (`healthy`) sem ação do usuário

### Requirement: Instalação e remoção versionadas das units systemd
As units systemd da POC SHALL ser versionadas em `deploy/poc/systemd/` (fonte de
verdade no repositório, não apenas arquivos soltos no host). O `deploy/poc/deploy.sh`
SHALL oferecer subcomando `install` (instala as units em `/etc/systemd/system/`,
roda `daemon-reload` e `enable`) e `uninstall` (desabilita e remove as units).

#### Scenario: Instalar units
- **WHEN** o usuário executa `./deploy.sh install`
- **THEN** as units de backend/caddy são copiadas para `/etc/systemd/system/`
- **THEN** `systemctl daemon-reload` é executado
- **THEN** as units ficam habilitadas (`enabled`) para o boot

#### Scenario: Remover units
- **WHEN** o usuário executa `./deploy.sh uninstall`
- **THEN** as units são desabilitadas e removidas de `/etc/systemd/system/`
- **THEN** `systemctl daemon-reload` é executado

### Requirement: Backend POC iniciado automaticamente no boot
O serviço `interact-poc-backend.service` SHALL ser habilitado e iniciado no boot do
SO, antes de qualquer usuário logar, sem ação manual. Ele SHALL carregar as
variáveis de ambiente de `deploy/poc/.env.poc` (`EnvironmentFile`) e executar o
backend Node na porta definida (3003) com o `WorkingDirectory` do `backend/`.

#### Scenario: Boot sem usuário logado
- **WHEN** o SO inicia e atinge o multi-user target (sem login de usuário)
- **THEN** `interact-poc-backend.service` está `active (running)`
- **THEN** a porta 3003 responde a `GET /health` com 200

### Requirement: Backend tolera Mongo ainda não pronto no boot
Como o Docker/Mongo podem demorar mais que o backend no boot, o serviço SHALL
usar `Restart=on-failure` com limite de reinícios não-zerável (`StartLimitIntervalSec=0`)
e intervalo razoável (`RestartSec`), de forma que o backend continue tentando até o
Mongo ficar pronto, sem travar em `failed`.

#### Scenario: Mongo sobe após o backend na mesma sequência de boot
- **WHEN** o backend inicia antes do Mongo estar saudável
- **THEN** o login/consultas falham transientemente
- **THEN** o systemd reinicia o backend até o Mongo responder
- **THEN** o backend estabiliza em `active (running)` e o feed/CRUD funcionam

### Requirement: Caddy POC iniciado automaticamente no boot após o backend
O serviço `interact-poc-caddy.service` SHALL ser habilitado e iniciado no boot, com
`After=`/`Wants=` do `interact-poc-backend.service`, servindo o `Caddyfile` de
`deploy/poc/` na porta 3005.

#### Scenario: Boot completo da stack
- **WHEN** o SO reinicia e o backend está ativo
- **THEN** `interact-poc-caddy.service` está `active (running)`
- **THEN** a porta 3005 responde pelo proxy (admin/API/PWA) conforme o Caddyfile

### Requirement: Acesso pela rede tailnet após o boot
O serve do Tailscale (porta 8444 → `localhost:3005`) SHALL permanecer ativo após o
boot sem ação manual, pois a configuração de `tailscale serve` persiste no estado do
`tailscaled` (dependência do serviço `tailscaled` habilitado). Após o boot, a URL
`https://obj.taild259e7.ts.net:8444/` SHALL responder 200 roteando para a stack.

#### Scenario: Acesso pós-reboot pela URL tailnet
- **WHEN** o SO reinicia e a stack (docker+mongo+backend+caddy) está de pé
- **THEN** `curl -sS https://obj.taild259e7.ts.net:8444/health` responde com status ok
- **THEN** PWA e painel admin abrem normalmente pela URL tailnet
