#!/usr/bin/env bash
# Atualiza o IP do domínio DuckDNS. Rodado a cada 5 min via systemd timer
# (deploy/duckdns-update.timer) ou cron — ver deploy/README.md.
set -euo pipefail

ENV_FILE="${DUCKDNS_ENV_FILE:-/opt/personal-task-manager/deploy/duckdns.env}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${DUCKDNS_DOMAIN:?defina DUCKDNS_DOMAIN (sem .duckdns.org) em $ENV_FILE}"
: "${DUCKDNS_TOKEN:?defina DUCKDNS_TOKEN em $ENV_FILE}"

response=$(curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=")

if [ "$response" != "OK" ]; then
  echo "DuckDNS update falhou: $response" >&2
  exit 1
fi

echo "DuckDNS atualizado com sucesso ($(date -u +%FT%TZ))"
