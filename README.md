# personal-task-manager

Gerenciador pessoal de tarefas de trabalho, com três níveis de prioridade
(emergencial, com prazo, longo prazo), subtarefas em checklist com
aninhamento infinito e progresso calculado recursivamente por folhas.

Arquitetura cliente-servidor single-user: API REST em Node.js/Fastify +
PostgreSQL, acessada por uma web mobile-first (React, instalável como PWA)
e por uma CLI (Commander.js), nunca acessando o banco diretamente.

## Sumário

- [Domínio](#domínio)
- [Stack](#stack)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Começando (desenvolvimento)](#começando-desenvolvimento)
- [Testes](#testes)
- [CLI](#cli)
- [Deploy](#deploy)
- [Documentação](#documentação)
- [Licença](#licença)

## Domínio

| Tipo | Prioridade | Regra |
|---|---|---|
| `E` — Emergencial | máxima | sempre no topo, ordenada por deadline; deadline obrigatório |
| `M` — Prazo definido | média | ordenada por deadline; deadline obrigatório |
| `S` — Longo prazo | baixa | sem cobrança de prazo; ordenação manual (`sort_order`) |

Cada tarefa pode ter subtarefas, e cada subtarefa pode ter subtarefas —
aninhamento infinito, validado contra ciclos ao mover um nó. O progresso de
uma tarefa é **folhas concluídas ÷ total de folhas** (nós intermediários não
contam por si só; ver `spec.md` §2.4 para exemplos).

Regras completas, decisões de arquitetura e casos de teste estão em
[`spec.md`](spec.md) e [`PLANO.md`](PLANO.md).

## Stack

| Camada | Escolha |
|---|---|
| API | Node.js + Fastify |
| Banco | PostgreSQL + Prisma |
| Validação | Zod (schemas compartilhados entre API, web e CLI) |
| Auth | JWT + Argon2id, single-user, provisionado via SSH |
| Testes | Vitest + Supertest + Testing Library |
| Web | React + Vite, mobile-first, PWA |
| CLI | Commander.js + chalk |
| Deploy | Docker Compose (Caddy + app + Postgres), TLS via Let's Encrypt |

## Estrutura do projeto

```
/src
  /domain        # regras puras: validação por tipo, ordenação, progresso, anti-ciclo
  /api            # rotas/handlers HTTP (finos) + middleware de auth
  /db             # cliente Prisma
/cli               # cliente CLI (Commander.js)
/web               # frontend React/Vite
/scripts           # user:create, user:password, migrate-test-db
/deploy            # scripts e unidades systemd (DuckDNS, backup)
/tests
  /unit            # regras de domínio
  /integration     # endpoints via Supertest (Postgres de teste)
prisma/            # schema e migrations
install.sh         # instalador de um comando para deploy em VPS
```

## Começando (desenvolvimento)

Pré-requisitos: Node.js 20+, Docker (para o Postgres de dev).

```bash
npm install
cp .env.example .env

docker compose -f docker-compose.dev.yml up -d db db_test
npx prisma migrate dev

npm run dev          # API em http://localhost:3000
npm run dev -w web   # web em http://localhost:5173
```

O frontend consome a API em `/api` por padrão (configurável via
`VITE_API_URL`); a CLI consome via `TASK_CLI_API_URL` (ver `cli/src/config.ts`).

## Testes

```bash
npm run test:unit          # domínio puro, sem banco
npm run test:integration   # endpoints via Supertest (exige db_test rodando)
npm test                   # os dois

npm test -w web             # testes de lógica do frontend
npm test -w cli              # testes da CLI
```

Este projeto segue SDD + TDD: toda funcionalidade nova começa por uma seção
correspondente em `spec.md`, com testes escritos antes da implementação. Ver
[`CLAUDE.md`](CLAUDE.md) para o processo completo.

## CLI

```bash
task login <usuario> <senha> --api-url https://seu-dominio/api
task list
task add "Revisar PR" -t M -d 2026-08-01T18:00:00.000Z
task sub add <taskId> "Ler o diff" --parent <subtaskId>
task done <id>
```

## Deploy

Guia completo, incluindo checklist de smoke test, em [`DEPLOY.md`](DEPLOY.md).

Instalação de um comando numa VPS Ubuntu/Debian:

```bash
curl -fsSL https://raw.githubusercontent.com/VSennaa/personal-task-manager/main/install.sh | bash
```

Resolve os requisitos que faltarem, clona o repositório, sobe
`docker-compose.prod.yml` (Caddy com TLS automático + API + Postgres) e
instala o comando `task-manager-user` para provisionar o login via SSH —
não há endpoint público de cadastro.

## Documentação

- [`spec.md`](spec.md) — fonte de verdade do domínio e da arquitetura.
- [`PLANO.md`](PLANO.md) — roadmap de execução por fases.
- [`CLAUDE.md`](CLAUDE.md) — processo de trabalho (SDD/TDD) e convenções.
- [`DEPLOY.md`](DEPLOY.md) — deploy em produção e smoke test.

## Licença

Nenhuma licença definida ainda. Uso pessoal — se for reutilizar o código,
abra uma issue ou entre em contato.
