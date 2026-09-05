#!/usr/bin/env bash
# Demo POC "homeless" — monta/encerra a demo do Interact via Tailscale.
# Uso: ./deploy.sh [up|down|status]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$POC/.env.poc"
BACKEND="$ROOT/backend"
PWA="$ROOT/frontend_pwa"
ADMIN="$ROOT/frontend_admin"

POC_HOST="${POC_HOST:-obj.taild259e7.ts.net:8444}"
POC_SERVE_PORT="${POC_SERVE_PORT:-8444}"

require_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Faltando $ENV_FILE (copie de .env.poc.example e preencha os segredos)." >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  if [[ "$JWT_SECRET" == "CHANGE-ME" || "$ENCRYPTION_KEY" == "CHANGE-ME" ]]; then
    echo "Preencha JWT_SECRET e ENCRYPTION_KEY em $ENV_FILE." >&2
    exit 1
  fi
}

up() {
  require_env

  echo "[1/6] Build do PWA..."
  (cd "$PWA" && npm run build)

  echo "[2/6] Build do Admin (VITE_API_URL=https://$POC_HOST, base /admin/)..."
  (cd "$ADMIN" && VITE_API_URL="https://$POC_HOST" npx vite build --base=/admin/)

  echo "[3/6] Seed da base POC (interact_poc)..."
  (cd "$BACKEND" && MONGODB_URI="$MONGODB_URI" node src/db/seed.js)

  echo "[4/6] Backend POC na porta $PORT..."
  if ss -ltn | grep -q ":$PORT "; then
    echo "  porta $PORT já em uso; assumindo backend já no ar."
  else
    (cd "$BACKEND" && setsid nohup env "PORT=$PORT" "MONGODB_URI=$MONGODB_URI" \
      "JWT_SECRET=$JWT_SECRET" "ENCRYPTION_KEY=$ENCRYPTION_KEY" \
      "DEFAULT_TENANT_SLUG=$DEFAULT_TENANT_SLUG" \
      node src/server.js >> /tmp/interact-poc-api.log 2>&1 < /dev/null & disown)
    echo "  backend subindo (log: /tmp/interact-poc-api.log)"
  fi

  echo "[5/6] Caddy (reverse proxy local :3005)..."
  if ! ss -ltn | grep -q ":3005 "; then
    setsid nohup caddy run --config "$POC/Caddyfile" >> /tmp/interact-poc-caddy.log 2>&1 < /dev/null & disown
    echo "  caddy subindo (log: /tmp/interact-poc-caddy.log)"
  else
    pkill -f '[p]oc/Caddyfile' || true
    sleep 1
    setsid nohup caddy run --config "$POC/Caddyfile" >> /tmp/interact-poc-caddy.log 2>&1 < /dev/null & disown
    echo "  caddy reiniciado para aplicar o Caddyfile"
  fi

  echo "[6/6] Tailscale serve (hostname do obj, https://$POC_HOST) → :3005..."
  tailscale serve --bg "--https=$POC_SERVE_PORT" "http://localhost:3005" || true

  echo "Demo pronta em https://$POC_HOST/ (PWA) e /admin/ (painel)."
  echo "Saúde: curl -sS https://$POC_HOST/health"
}

down() {
  echo "Removendo proxy tailscale na porta $POC_SERVE_PORT..."
  tailscale serve --https="$POC_SERVE_PORT" off || true
  echo "Parando caddy e backend POC (pids abaixo):"
  pgrep -af '[p]oc/Caddyfile' || true
  pgrep -af 'server.js' | grep -i poc || true
  echo "  para encerrar: pkill -f '[p]oc/Caddyfile'; pkill -f 'PORT=3003' (ajuste se preciso)"
}

status() {
  echo "== tailscale serve =="
  tailscale serve status
  echo "== listeners =="
  ss -ltn | grep -E ':3003 |:3005 ' || true
  echo "== health =="
  curl -sS "https://$POC_HOST/health" || true
  echo
}

case "${1:-up}" in
  up) up ;;
  down) down ;;
  status) status ;;
  *) echo "uso: $0 [up|down|status]"; exit 1 ;;
esac