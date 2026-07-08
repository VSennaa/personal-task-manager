# Deploy em produção (VPS + Docker)

Guia passo a passo para colocar o sistema no ar em `https://vsenaa.duckdns.org`,
seguindo a Fase 5 do `PLANO.md` (infra, sem TDD — validação por smoke test).

## 0. Pré-requisitos na VPS

- Ubuntu/Debian com acesso SSH.
- Docker Engine + Docker Compose plugin instalados
  (`curl -fsSL https://get.docker.com | sh`).
- Conta em [duckdns.org](https://www.duckdns.org) com o domínio `vsenaa`
  criado e apontando para o IP atual da VPS (mesmo que mude depois — o
  timer da seção 4 mantém atualizado).

## 1. Clonar o repositório

```bash
sudo mkdir -p /opt/personal-task-manager
sudo chown "$USER" /opt/personal-task-manager
git clone https://github.com/VSennaa/personal-task-manager.git /opt/personal-task-manager
cd /opt/personal-task-manager
```

## 2. Firewall

Apenas 22 (SSH), 80 e 443 (HTTP/HTTPS) ficam abertos; Postgres e a porta
interna da API **nunca** são expostos (já garantido pelo
`docker-compose.prod.yml`, que não publica portas de `app`/`db`).

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

## 3. Variáveis de ambiente de produção

```bash
cp .env.example .env
```

Edite `.env` e troque **no mínimo**:

- `JWT_SECRET`: segredo forte e aleatório (ex.: `openssl rand -base64 48`).
- `POSTGRES_PASSWORD`: senha forte para o Postgres.
- `DOMAIN`: mantenha `vsenaa.duckdns.org` (ou o seu domínio DuckDNS).

`.env` nunca é commitado (está no `.gitignore`) e a senha do usuário da
aplicação **não** vai nesse arquivo — ela é definida via SSH na seção 6.

## 4. DuckDNS (atualização automática de IP)

```bash
cp deploy/duckdns.env.example deploy/duckdns.env
```

Edite `deploy/duckdns.env` com seu `DUCKDNS_TOKEN` (painel do duckdns.org).
Teste manualmente:

```bash
chmod +x deploy/duckdns-update.sh deploy/backup.sh
./deploy/duckdns-update.sh   # deve imprimir "DuckDNS atualizado com sucesso"
```

Instale o timer systemd (roda a cada 5 min):

```bash
sudo cp deploy/duckdns-update.service deploy/duckdns-update.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now duckdns-update.timer
systemctl list-timers | grep duckdns
```

> Alternativa sem systemd: `crontab -e` e adicionar
> `*/5 * * * * DUCKDNS_ENV_FILE=/opt/personal-task-manager/deploy/duckdns.env /opt/personal-task-manager/deploy/duckdns-update.sh >> /var/log/duckdns.log 2>&1`

## 5. Subir os containers

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Isso builda e sobe 3 serviços: `caddy` (TLS automático via Let's Encrypt,
serve a web estática e faz proxy de `/api/*` para `app`), `app` (API
Fastify, porta interna) e `db` (Postgres, volume nomeado, sem porta
exposta). O Caddy obtém o certificado automaticamente na primeira
requisição HTTPS ao domínio configurado.

## 6. Migrations e usuário

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec app npm run user:create
```

`user:create` é interativo (pede username/senha) — só existe esse caminho
para provisionar usuário; não há endpoint público de cadastro.

## 7. Backup automático (pg_dump diário, rotação de 7 dias)

```bash
sudo mkdir -p /opt/backups/personal-task-manager
sudo cp deploy/backup.service deploy/backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now backup.timer
```

Teste manualmente antes de confiar no agendamento:

```bash
sudo PROJECT_DIR=/opt/personal-task-manager BACKUP_DIR=/opt/backups/personal-task-manager ./deploy/backup.sh
ls /opt/backups/personal-task-manager
```

## 8. Smoke test (critério de saída da Fase 5)

Pelo celular, via HTTPS público:

1. Abrir `https://vsenaa.duckdns.org`, fazer login.
2. Criar uma E-Task com deadline próximo → confirmar que aparece no topo
   da listagem, destacada.
3. Abrir a task, adicionar uma subtarefa, marcar como concluída →
   conferir que a barra de progresso atualiza.
4. Instalar como PWA (menu do navegador → "adicionar à tela inicial").

Depois, no Termux (ou desktop) via CLI:

```bash
task login <usuario> <senha> --api-url https://vsenaa.duckdns.org/api
task list
task add "Teste via CLI" -t S
task done <id>
```

Se os dois fluxos funcionarem, a Fase 5 está completa.

## Operação do dia a dia

```bash
# logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f caddy

# redeploy após git pull
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# trocar senha de usuário
docker compose -f docker-compose.prod.yml exec app npm run user:password

# parar tudo
docker compose -f docker-compose.prod.yml down
```

## Estrutura dos arquivos de deploy

| Arquivo                        | Papel                                                     |
|---------------------------------|-----------------------------------------------------------|
| `docker-compose.prod.yml`       | orquestra caddy + app + db em produção                    |
| `Dockerfile`                    | build da API (stage `production`)                          |
| `Dockerfile.caddy`               | builda a web estática e empacota com o Caddy               |
| `Caddyfile`                      | TLS automático (Let's Encrypt) + roteamento `/api` vs web  |
| `deploy/duckdns-update.sh(+.timer/.service)` | mantém o DNS apontando para o IP atual da VPS |
| `deploy/backup.sh(+.timer/.service)`         | `pg_dump` diário com rotação de 7 dias        |
