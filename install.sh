#!/usr/bin/env bash
# personal-task-manager — instalador de um comando só.
#
# Uso (numa VPS Ubuntu/Debian limpa, como root ou usuário com sudo):
#
#   curl -fsSL https://raw.githubusercontent.com/VSennaa/personal-task-manager/main/install.sh | bash
#
# Resolve os requisitos que faltarem (git, curl, openssl, Docker + Compose
# plugin, ufw), clona o repositório, sobe o docker-compose.prod.yml, roda as
# migrations e instala o comando `task-manager-user` no PATH para provisionar
# (ou trocar) a senha do usuário via SSH — ver DEPLOY.md para o passo a passo
# detalhado e o checklist de smoke test.
#
# Variáveis de ambiente (todas opcionais):
#   REPO_URL        (default: https://github.com/VSennaa/personal-task-manager.git)
#   BRANCH           (default: main)
#   INSTALL_DIR      (default: /opt/personal-task-manager)
#   DOMAIN           (default: vsenaa.duckdns.org)
#   DUCKDNS_DOMAIN   (opcional — se definido junto com DUCKDNS_TOKEN, configura
#                     e ativa o timer de atualização do DuckDNS automaticamente)
#   DUCKDNS_TOKEN    (opcional, ver acima)
#   SKIP_FIREWALL    (default: vazio; defina "1" para não mexer no ufw)

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/VSennaa/personal-task-manager.git}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-/opt/personal-task-manager}"
DOMAIN="${DOMAIN:-vsenaa.duckdns.org}"
SKIP_FIREWALL="${SKIP_FIREWALL:-}"

# ---------- helpers de log ----------
c_reset="\033[0m"; c_green="\033[32m"; c_yellow="\033[33m"; c_red="\033[31m"; c_blue="\033[34m"
log()  { printf "%b\n" "${c_blue}==>${c_reset} $*"; }
ok()   { printf "%b\n" "${c_green}✓${c_reset} $*"; }
warn() { printf "%b\n" "${c_yellow}!${c_reset} $*"; }
die()  { printf "%b\n" "${c_red}✗ $*${c_reset}" >&2; exit 1; }

trap 'die "instalação interrompida (linha $LINENO). Veja a mensagem acima para o que falhou."' ERR

# ---------- sudo/root ----------
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  command -v sudo >/dev/null 2>&1 || die "rode como root ou instale o sudo antes de continuar."
  SUDO="sudo"
fi

# ---------- checagem de SO ----------
if ! command -v apt-get >/dev/null 2>&1; then
  die "este instalador só suporta distros baseadas em apt (Ubuntu/Debian). Siga o DEPLOY.md manualmente."
fi

apt_updated=""
ensure_apt_updated() {
  if [ -z "$apt_updated" ]; then
    log "atualizando índice de pacotes (apt-get update)..."
    $SUDO apt-get update -y >/dev/null
    apt_updated=1
  fi
}

ensure_pkg() {
  local bin="$1" pkg="${2:-$1}"
  if ! command -v "$bin" >/dev/null 2>&1; then
    ensure_apt_updated
    log "instalando $pkg..."
    $SUDO apt-get install -y "$pkg" >/dev/null
    ok "$pkg instalado."
  else
    ok "$bin já disponível."
  fi
}

# ---------- requisitos ----------
log "checando requisitos..."
ensure_pkg git
ensure_pkg curl
ensure_pkg openssl

if ! command -v docker >/dev/null 2>&1; then
  log "Docker não encontrado — instalando via get.docker.com..."
  curl -fsSL https://get.docker.com | $SUDO sh
  ok "Docker instalado."
else
  ok "Docker já disponível."
fi

# Descobre se dá para falar com o daemon sem sudo (ex.: usuário acabado de
# instalar o Docker ainda não está no grupo "docker") antes de qualquer
# outro comando "docker", para não reinstalar coisas por engano.
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  DOCKER="$SUDO docker"
fi

if ! $DOCKER compose version >/dev/null 2>&1; then
  ensure_apt_updated
  log "instalando docker-compose-plugin..."
  $SUDO apt-get install -y docker-compose-plugin >/dev/null
  ok "docker compose plugin instalado."
else
  ok "docker compose já disponível."
fi

# ---------- firewall ----------
if [ -z "$SKIP_FIREWALL" ]; then
  ensure_pkg ufw
  log "configurando firewall (22, 80, 443)..."
  $SUDO ufw allow 22/tcp >/dev/null
  $SUDO ufw allow 80/tcp >/dev/null
  $SUDO ufw allow 443/tcp >/dev/null
  $SUDO ufw --force enable >/dev/null
  ok "ufw ativo com 22/80/443 liberadas."
else
  warn "SKIP_FIREWALL definido — pulando configuração do ufw."
fi

# ---------- clone / update ----------
if [ -d "$INSTALL_DIR/.git" ]; then
  log "repositório já existe em $INSTALL_DIR — atualizando..."
  git -C "$INSTALL_DIR" fetch origin "$BRANCH"
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull origin "$BRANCH"
else
  log "clonando $REPO_URL em $INSTALL_DIR..."
  $SUDO mkdir -p "$(dirname "$INSTALL_DIR")"
  $SUDO git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  $SUDO chown -R "$(id -u):$(id -g)" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
ok "código em $INSTALL_DIR (branch $BRANCH)."

# ---------- .env de produção ----------
if [ ! -f .env ]; then
  log "gerando .env de produção (segredos aleatórios)..."
  cp .env.example .env
  jwt_secret="$(openssl rand -base64 48 | tr -d '\n')"
  pg_password="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9')"
  sed -i "s#^JWT_SECRET=.*#JWT_SECRET=\"${jwt_secret}\"#" .env
  sed -i "s#^POSTGRES_PASSWORD=.*#POSTGRES_PASSWORD=${pg_password}#" .env
  sed -i "s#^DOMAIN=.*#DOMAIN=${DOMAIN}#" .env
  ok ".env criado com JWT_SECRET e POSTGRES_PASSWORD aleatórios. Guarde uma cópia em local seguro."
else
  ok ".env já existe — mantendo o que já está configurado."
fi

# ---------- DuckDNS (opcional, se as variáveis foram passadas) ----------
if [ -n "${DUCKDNS_DOMAIN:-}" ] && [ -n "${DUCKDNS_TOKEN:-}" ]; then
  log "configurando atualização automática do DuckDNS..."
  cat > deploy/duckdns.env <<EOF
DUCKDNS_DOMAIN=${DUCKDNS_DOMAIN}
DUCKDNS_TOKEN=${DUCKDNS_TOKEN}
EOF
  chmod +x deploy/duckdns-update.sh deploy/backup.sh
  if command -v systemctl >/dev/null 2>&1; then
    $SUDO cp deploy/duckdns-update.service deploy/duckdns-update.timer /etc/systemd/system/
    $SUDO sed -i "s#/opt/personal-task-manager#${INSTALL_DIR}#g" /etc/systemd/system/duckdns-update.service
    $SUDO systemctl daemon-reload
    $SUDO systemctl enable --now duckdns-update.timer >/dev/null
    ok "timer do DuckDNS ativo (atualiza a cada 5 min)."
  else
    warn "systemd não encontrado — agende deploy/duckdns-update.sh no cron manualmente (ver DEPLOY.md)."
  fi
else
  chmod +x deploy/duckdns-update.sh deploy/backup.sh
  warn "DUCKDNS_DOMAIN/DUCKDNS_TOKEN não definidos — pulei a atualização automática de DNS."
  warn "configure depois: cp deploy/duckdns.env.example deploy/duckdns.env && edite o token (ver DEPLOY.md §4)."
fi

# ---------- backup diário (systemd timer) ----------
if command -v systemctl >/dev/null 2>&1; then
  log "instalando backup diário (pg_dump, rotação de 7 dias)..."
  $SUDO mkdir -p /opt/backups/personal-task-manager
  $SUDO cp deploy/backup.service deploy/backup.timer /etc/systemd/system/
  $SUDO sed -i "s#/opt/personal-task-manager#${INSTALL_DIR}#g" /etc/systemd/system/backup.service
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable --now backup.timer >/dev/null
  ok "timer de backup ativo (diariamente às 03:00)."
else
  warn "systemd não encontrado — agende deploy/backup.sh no cron manualmente (ver DEPLOY.md)."
fi

# ---------- build + subir os containers ----------
log "buildando e subindo os containers (caddy + app + db)... isso pode levar alguns minutos na primeira vez."
$DOCKER compose -f docker-compose.prod.yml up -d --build
ok "containers no ar."

log "aguardando o Postgres ficar pronto..."
tries=0
until $DOCKER compose -f docker-compose.prod.yml exec -T db pg_isready -U "$(grep -m1 '^POSTGRES_USER=' .env | cut -d= -f2)" >/dev/null 2>&1; do
  tries=$((tries + 1))
  [ "$tries" -gt 30 ] && die "Postgres não ficou pronto a tempo — confira 'docker compose -f docker-compose.prod.yml logs db'."
  sleep 2
done
ok "Postgres pronto."

log "rodando migrations (prisma migrate deploy)..."
$DOCKER compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy
ok "migrations aplicadas."

# ---------- comando task-manager-user ----------
log "instalando o comando 'task-manager-user' no PATH..."
$SUDO tee /usr/local/bin/task-manager-user >/dev/null <<EOF
#!/usr/bin/env bash
# Provisiona (create) ou troca (password) a senha do usuário single-user
# do personal-task-manager, via SSH — nunca há endpoint público de cadastro.
set -euo pipefail
cd "${INSTALL_DIR}"
action="\${1:-create}"
case "\$action" in
  create)   docker compose -f docker-compose.prod.yml exec app npm run user:create ;;
  password) docker compose -f docker-compose.prod.yml exec app npm run user:password ;;
  *) echo "uso: task-manager-user [create|password]" >&2; exit 1 ;;
esac
EOF
$SUDO chmod +x /usr/local/bin/task-manager-user
ok "comando instalado: rode 'task-manager-user' (ou 'task-manager-user password') de qualquer diretório."

echo
ok "deploy concluído em https://${DOMAIN}"
echo
echo "Próximos passos:"
echo "  1. task-manager-user            # cria o usuário (prompt interativo de username/senha)"
echo "  2. abra https://${DOMAIN} e faça login"
echo "  3. rode o smoke test do DEPLOY.md §8 (criar E-Task, subtarefa, progresso, CLI)"
