# Spec: Gerenciamento de Tarefas (E-Task / M-Task / S-Task)

> Fonte de verdade do domínio e da arquitetura. Toda funcionalidade nova começa
> por uma seção aqui (SDD). Nenhuma regra abaixo pode ser violada sem antes
> atualizar este documento.

## 1. Visão Geral

Sistema pessoal (single-user) de gerenciamento de tarefas de trabalho, com três
categorias de prioridade, subtarefas em checklist com **aninhamento infinito** e
progresso calculado recursivamente.

Arquitetura cliente-servidor: backend Node.js + PostgreSQL numa VPS, acessado por:

- **Web** (mobile-first; desktop como layout secundário) — canal principal.
- **CLI** (Termux/desktop) — consome a mesma API REST.

Acesso público via `https://vsenaa.duckdns.org` (DuckDNS → IP da VPS), com TLS
automático via Caddy + Let's Encrypt. Login obrigatório (ver seção 7).

## 2. Domínio

### 2.1 Task

| Campo       | Tipo                                                   | Obrigatório | Observação                                  |
|-------------|--------------------------------------------------------|-------------|----------------------------------------------|
| id          | UUID                                                   | sim         | gerado pelo servidor                         |
| title       | string (1..200)                                        | sim         |                                              |
| description | text                                                   | não         |                                              |
| type        | enum: `E` \| `M` \| `S`                                | sim         | ver 2.2                                      |
| deadline    | datetime (ISO 8601, UTC)                               | condicional | **obrigatório** para `E` e `M`; opcional em `S` |
| budget      | decimal(12,2)                                          | não         | orçamento estimado/gasto                     |
| status      | enum: `open` \| `in_progress` \| `done` \| `cancelled` | sim         | default `open`                               |
| sort_order  | integer                                                | sim         | ordenação manual entre `S-Task` (default: fim da lista) |
| created_at  | datetime                                               | sim         |                                              |
| updated_at  | datetime                                               | sim         |                                              |

### 2.2 Regras por tipo

- **E-Task** (emergencial): prioridade máxima. Sempre no topo de qualquer listagem
  padrão, ordenada por deadline mais próximo. Destaque visual forte na UI
  (cor de urgência + contagem regressiva).
- **M-Task** (prazo definido): prioridade média. Ordenada por deadline mais próximo.
  UI mostra "faltam X dias/horas", mudando de cor conforme o prazo aproxima.
- **S-Task** (longo prazo): prioridade baixa. Sem cobrança de prazo. Ordenada por
  `sort_order` (manual); empate resolve por `created_at`.

> **Notificações**: fora de escopo nesta versão (decisão registrada). O destaque
> visual na listagem substitui alertas/lembretes. Se voltar ao escopo, criar
> seção própria antes de implementar.

### 2.3 Subtarefas (checklist, aninhamento infinito)

- Cada Task pode ter subtarefas; **cada subtarefa pode ter subtarefas**, sem
  limite de profundidade (`parent_id` auto-referente).

| Campo      | Tipo    | Observação                                     |
|------------|---------|-------------------------------------------------|
| id         | UUID    |                                                 |
| task_id    | UUID    | tarefa raiz à qual pertence (sempre preenchido) |
| parent_id  | UUID?   | null se subtarefa de 1º nível                   |
| title      | string  |                                                 |
| is_done    | boolean | default false                                   |
| notes      | text    | anotações livres                                |
| sort_order | integer | ordenação manual dentro do nível                |

**Invariantes (validadas no domínio, testadas antes de implementar):**

1. **Sem ciclos**: ao mover uma subtarefa (mudar `parent_id`), o novo pai não
   pode ser a própria subtarefa nem um descendente dela.
2. **Consistência de raiz**: `task_id` da subtarefa é sempre igual ao `task_id`
   de seu pai (não se move subtarefa entre tasks diferentes nesta versão).

### 2.4 Progresso (regra fechada)

**Progresso da Task = folhas concluídas ÷ total de folhas**, onde *folha* é uma
subtarefa sem filhos. Cada folha pesa igual, independentemente da profundidade.

- Subtarefa **com filhos** não conta como unidade própria: seu `is_done` é
  informativo/agregador na UI, mas o progresso deriva só das folhas.
- Task **sem subtarefas**: progresso = 0% se `status` ≠ `done`; 100% se `done`.

Exemplo:

```
Task
├── A (folha, done)          → 1/3 concluída
├── B
│   ├── B1 (folha, done)     → mas B1 e B2 são 2 das 3 folhas
│   └── B2 (folha, aberta)
Progresso = 2 folhas done? Não: A done + B1 done = 2/3 ≈ 66,7%
```

(Folhas: A, B1, B2. Concluídas: A e B1. Progresso = 2/3.)

## 3. Arquitetura

```
[ Web mobile-first ]      [ CLI Termux/desktop ]
          \                       /
           v                     v
   Caddy (TLS, vsenaa.duckdns.org)
                 |
          API REST (Node.js) ── VPS
                 |
            PostgreSQL
```

- Web e CLI **nunca** acessam o Postgres diretamente — sempre via API REST.
- Postgres e porta interna da API não são expostos à internet (rede interna do
  Docker Compose; firewall só com 22/80/443).

### 3.1 Stack (decidida)

| Camada     | Escolha                          | Motivo                                   |
|------------|----------------------------------|-------------------------------------------|
| HTTP       | Fastify                          | leve, schema-friendly, rate limit fácil   |
| ORM        | Prisma + PostgreSQL              | migrations + type-safety                  |
| Validação  | Zod (fonte única, compartilhada) | reuso entre domínio, API e CLI            |
| Testes     | Vitest + Supertest               | rápido, TS nativo                         |
| CLI        | Commander.js + chalk             |                                           |
| Web        | React + Vite, PWA leve           | HTTPS já disponível → PWA viável          |
| Auth       | JWT + Argon2                     | ver seção 7                               |
| Proxy/TLS  | Caddy + Let's Encrypt            | certificado automático via DuckDNS        |
| Deploy     | Docker Compose (app+db+caddy)    |                                           |

## 4. API

Todos os endpoints (exceto `POST /auth/login` e `GET /health`) exigem
`Authorization: Bearer <jwt>`.

```
POST   /auth/login           # { username, password } → { token }

GET    /tasks                # listagem padrão ordenada (seção 5); filtros ?type= &status=
POST   /tasks                # cria task (validação por tipo)
GET    /tasks/:id            # detalhe com árvore de subtarefas aninhada
PATCH  /tasks/:id            # status, deadline, budget, title, sort_order...
DELETE /tasks/:id            # remove task e toda a árvore de subtarefas

POST   /tasks/:id/subtasks   # cria subtarefa (parent_id opcional no body)
PATCH  /subtasks/:id         # is_done, title, notes, sort_order, parent_id (mover)
DELETE /subtasks/:id         # remove subtarefa e descendentes

GET    /tasks/:id/progress   # { totalLeaves, doneLeaves, percent }
GET    /health               # liveness, sem auth
```

**Erros**: JSON `{ error: { code, message } }`; 400 validação, 401 sem/inv token,
404 não encontrado, 409 para violação de invariante (ex: ciclo de subtarefa),
429 rate limit.

**Árvore aninhada**: montada em memória a partir de um SELECT plano por
`task_id` (suficiente para volume pessoal; CTE recursiva fica como otimização
futura, documentar se adotada).

## 5. Ordenação da listagem padrão

1. `E-Task` com status `open`/`in_progress`, por deadline crescente.
2. `M-Task` com status `open`/`in_progress`, por deadline crescente.
3. `S-Task` com status `open`/`in_progress`, por `sort_order`, empate por `created_at`.
4. `done`/`cancelled` **fora** da listagem padrão (acessíveis via `?status=done` etc.).

Empate de deadline entre E ou entre M: resolve por `created_at` crescente.

## 6. Web (mobile-first)

- **Tela principal**: lista única em uma coluna; E com destaque de urgência,
  M com deadline/contagem visível, S neutras. Alvos de toque ≥ 44px, sem hover.
- **Detalhe da task**: barra de progresso no topo; checklist aninhada com
  indentação até **3 níveis visuais** — do 4º nível em diante, colapsa em
  "abrir subitens" (navegação para dentro). A árvore no banco continua infinita;
  só a renderização se adapta.
- **Criação rápida**: título + tipo; campo deadline aparece e vira obrigatório
  dinamicamente quando tipo = E ou M.
- **Login**: tela simples; token em `localStorage` (aceitável para uso pessoal);
  401 em qualquer chamada → redireciona ao login.
- **PWA**: manifest + service worker mínimo (instalável na home screen).
  Offline-first fica fora de escopo nesta versão.
- Desktop: mesmo layout com largura máxima; sem trabalho extra dedicado.

## 7. Autenticação (single-user, provisionada via SSH)

- Tabela `users`: `id`, `username` (único), `password_hash` (**Argon2id**),
  `created_at`.
- **Nenhum endpoint público de cadastro.** Criação/troca de senha só via script
  executado por SSH no servidor:
  - `npm run user:create` — prompt interativo, faz hash e insere.
  - `npm run user:password` — troca de senha.
- `POST /auth/login` → JWT assinado com segredo em env var (`JWT_SECRET`),
  expiração de 30 dias (uso pessoal; renovar = logar de novo).
- **Rate limit** no login: 5 tentativas/min por IP (Fastify rate-limit).
- Middleware global de auth; whitelist: `/auth/login`, `/health`.

## 8. Deploy (VPS)

- **Domínio**: `vsenaa.duckdns.org` → IP da VPS. Cron/systemd timer reenvia o
  update do DuckDNS a cada 5 min (custo zero, evita quebra se o IP mudar).
- **Docker Compose** com 3 serviços:
  - `caddy`: portas 80/443, volume para certificados, proxy para `app`.
  - `app`: API Node, porta interna apenas.
  - `db`: Postgres, volume nomeado, sem porta exposta.
- **Firewall**: apenas 22, 80, 443 abertas.
- **Segredos** (`.env`, fora do git): `DATABASE_URL`, `JWT_SECRET`,
  senha do Postgres.
- **Backup**: `pg_dump` diário via cron para diretório fora do volume,
  rotação de 7 dias. Off-site (rclone) fica como melhoria futura.
- Usuário da aplicação criado via SSH **após** o primeiro deploy (senha nunca
  passa pelo git).

## 9. Estratégia de Testes (SDD/TDD)

Ciclo por funcionalidade, sem exceção mesmo para mudanças "óbvias":

1. **Spec**: escrever/atualizar a seção correspondente deste documento.
2. **Red**: escrever os testes e confirmar que falham.
3. **Green**: implementar o mínimo para passar.
4. **Refactor**: melhorar mantendo verde.
5. Commit atômico por ciclo quando possível.

Camadas de teste:

- **Unitários** (`/tests/unit`): regras de `/src/domain` — funções puras, sem
  banco nem HTTP.
- **Integração** (`/tests/integration`): endpoints via Supertest contra um
  Postgres de teste (container dedicado), com banco resetado entre suítes.
- Frontend: unitários de lógica (montagem/renderização da árvore, formatação de
  deadline); E2E fora de escopo nesta versão.

Cobertura mínima por área (detalhada em `PLANO.md`):

- Validação por tipo (deadline obrigatório em E/M; ausente permitido em S).
- Ordenação E > M > S com todos os desempates.
- Progresso por folhas com aninhamento profundo, árvore vazia, ramos parciais.
- Invariante anti-ciclo ao mover subtarefas.
- Auth: login ok, senha errada, token ausente/expirado/inválido, rate limit.
- Deleção em cascata (task → árvore; subtarefa → descendentes).

## 10. Decisões registradas (histórico)

| Decisão                          | Escolha                                          |
|----------------------------------|--------------------------------------------------|
| Profundidade de subtarefas       | Infinita (`parent_id` auto-referente)            |
| Regra de progresso               | Folhas pesam igual (seção 2.4)                   |
| Autenticação                     | Single-user, JWT, provisionamento via SSH        |
| Notificações                     | Fora de escopo; só destaque visual               |
| Exposição                        | Internet aberta com TLS obrigatório              |
| Domínio                          | DuckDNS (`vsenaa.duckdns.org`) + Caddy/LE        |
| Deploy                           | Docker Compose (caddy + app + db)                |
