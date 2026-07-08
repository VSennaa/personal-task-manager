# PLANO.md — Roadmap SDD/TDD

Roadmap de execução por fases. Cada feature segue o ciclo:
**spec → red (testes falhando) → green (mínimo) → refactor → commit atômico.**

Uma fase só inicia quando os **critérios de saída** da anterior estão cumpridos.

---

## Fase 0 — Fundação

Sem TDD de domínio ainda; o objetivo é a esteira funcionar.

**Entregas**
- Repositório com a estrutura de pastas do CLAUDE.md.
- TypeScript estrito (`tsconfig` compartilhado + por pacote se necessário).
- Vitest configurado com um teste trivial verde.
- Prisma inicializado; Docker Compose de **dev** (app + Postgres + Postgres de teste).
- Scripts npm: `test`, `test:unit`, `test:integration`, `dev`.
- Lint/format (ESLint + Prettier) e `.env.example`.

**Critérios de saída**
- `npm run test` verde.
- `docker compose up` sobe app + banco local.
- `npx prisma migrate dev` roda sem erro (schema vazio ou mínimo).

---

## Fase 1 — Domínio puro (`/src/domain`, testes em `/tests/unit`)

Funções puras, sem banco nem HTTP. Maior retorno do TDD.

### F1.1 Validação por tipo (schemas Zod)

Red — casos de teste:
- E sem deadline → inválido.
- M sem deadline → inválido.
- S sem deadline → válido.
- S com deadline → válido.
- E/M com deadline no passado → **válido** (tarefa atrasada é estado legítimo).
- `title` vazio ou > 200 chars → inválido.
- `type` fora do enum → inválido.
- `budget` negativo → inválido.
- `status` default `open` quando ausente na criação.
- PATCH que troca `type` de S→M sem deadline presente/fornecido → inválido.

### F1.2 Ordenação da listagem padrão

Red — casos de teste:
- E antes de M antes de S, independentemente de datas de criação.
- Entre E: deadline mais próximo primeiro; empate → `created_at` crescente.
- Entre M: idem.
- Entre S: `sort_order` crescente; empate → `created_at` crescente.
- `done`/`cancelled` excluídas da listagem padrão.
- `in_progress` incluída (equiparada a `open` para ordenação).
- Lista vazia → lista vazia (sem erro).

### F1.3 Progresso recursivo por folhas

Red — casos de teste:
- Task sem subtarefas, status ≠ done → 0%.
- Task sem subtarefas, status done → 100%.
- 3 folhas planas, 1 done → 33,3% (definir arredondamento: 1 casa decimal).
- Árvore do exemplo da spec §2.4 (A done; B→B1 done, B2 aberta) → 2/3.
- Aninhamento profundo (5+ níveis) com folhas espalhadas → conta só folhas.
- Nó intermediário com `is_done=true` mas filhos abertos → não afeta o cálculo.
- Todas as folhas done → 100%.
- Retorno estruturado: `{ totalLeaves, doneLeaves, percent }`.

### F1.4 Invariante anti-ciclo (mover subtarefa)

Red — casos de teste:
- Mover para o próprio id → rejeitado.
- Mover para um filho direto → rejeitado.
- Mover para um descendente profundo → rejeitado.
- Mover para um irmão → aceito.
- Mover para a raiz (`parent_id = null`) → aceito.
- Mover para nó de **outra** task → rejeitado (invariante de consistência §2.3).

**Critérios de saída da Fase 1**: todas as suítes acima verdes; nenhuma
dependência de Prisma/Fastify em `/src/domain`.

---

## Fase 2 — Banco + API + Auth (`/tests/integration`, Supertest)

Cada endpoint: testes de integração primeiro, contra Postgres de teste
resetado entre suítes.

### F2.1 Schema Prisma + migrations

- Tabelas `users`, `tasks`, `subtasks` (FK auto-referente `parent_id`,
  `ON DELETE CASCADE` em `task_id` e `parent_id`).
- Índices: `tasks(type, status, deadline)`, `subtasks(task_id)`,
  `subtasks(parent_id)`.

### F2.2 Auth

Red — casos de teste:
- Login com credenciais corretas → 200 + JWT válido.
- Senha errada → 401 (mesma mensagem genérica de usuário inexistente).
- Usuário inexistente → 401.
- Endpoint protegido sem token → 401.
- Token inválido/expirado → 401.
- Token válido → 200.
- 6ª tentativa de login no mesmo minuto/IP → 429.
- `/health` acessível sem token.
- Script `user:create`: cria usuário com hash Argon2id (teste unitário do
  helper de hash + verificação).

### F2.3 CRUD de tasks

Red — casos de teste:
- POST válido por tipo (E com deadline, M com deadline, S sem) → 201 + body completo.
- POST E/M sem deadline → 400 com código de validação.
- GET /tasks → ordem da Fase 1.2 aplicada; filtros `?type=`, `?status=` funcionam
  combinados.
- GET /tasks/:id → árvore de subtarefas aninhada correta.
- GET /tasks/:id inexistente → 404.
- PATCH status/deadline/budget/sort_order → 200; PATCH S→M sem deadline → 400.
- DELETE → 204; task some da listagem; subtarefas removidas em cascata.

### F2.4 CRUD de subtasks

Red — casos de teste:
- POST em task (sem parent) → 1º nível.
- POST com `parent_id` → aninhada; profundidade 5+ funciona.
- POST com `parent_id` de outra task → 409.
- PATCH `is_done` → refletido no progresso.
- PATCH `parent_id` criando ciclo → 409 (reusa F1.4).
- PATCH `sort_order` → reordenação dentro do nível.
- DELETE nó intermediário → descendentes removidos em cascata.

### F2.5 Progresso via API

Red — casos de teste:
- GET /tasks/:id/progress espelha F1.3 com dados persistidos.
- Task inexistente → 404.

**Critérios de saída da Fase 2**: suíte de integração verde no CI local;
handlers sem lógica de negócio (revisão manual).

---

## Fase 3 — Web mobile-first (`/web`)

### F3.1 Login + guarda de rotas
- Testes de lógica: token salvo, 401 → redirect, logout limpa storage.

### F3.2 Listagem principal
- Testes de lógica: agrupamento visual E/M/S a partir da resposta da API;
  formatação de contagem regressiva ("faltam 2d 4h"; vencida → "atrasada").
- UI: uma coluna, alvos ≥ 44px, destaque de urgência em E, cor progressiva
  em M conforme deadline.

### F3.3 Detalhe da task + checklist aninhada
- Testes de lógica: montagem da árvore a partir da lista plana; colapso do
  4º nível em diante ("abrir subitens"); toggle de done otimista com rollback
  em erro.
- Barra de progresso consumindo `/progress`.

### F3.4 Criação/edição
- Deadline dinâmico: aparece e vira obrigatório quando tipo ∈ {E, M}
  (validação client-side reutilizando os schemas Zod do domínio).

### F3.5 PWA mínimo
- Manifest + ícones + service worker básico (instalável; offline fora de escopo).

**Critérios de saída**: fluxo completo usável no celular contra a API local.

---

## Fase 4 — CLI (`/cli`)

- `task login` → salva token em `~/.config/task-cli/config.json`; URL da API
  configurável (env/flag/arquivo).
- `task list` (ordem padrão, E destacada com chalk), `task add`, `task done <id>`,
  `task sub add <taskId> [--parent <id>]`, `task sub done <id>`, `task rm`.
- Testes de integração apontando para a API de teste; teste de erro amigável
  quando sem token/401.

**Critérios de saída**: fluxo básico completo no Termux (login → list → add → done).

---

## Fase 5 — Deploy na VPS

Checklist (infra, sem TDD; validação manual + smoke test):

1. Docker Compose de produção: `caddy` (80/443, volume de certs), `app`
   (porta interna), `db` (volume nomeado, sem porta exposta).
2. Caddyfile com `vsenaa.duckdns.org` → certificado Let's Encrypt automático.
3. Cron/systemd timer do DuckDNS (update de IP a cada 5 min).
4. Firewall: só 22/80/443.
5. `.env` de produção criado na VPS (DATABASE_URL, JWT_SECRET, senha do Postgres).
6. Migrations em produção (`prisma migrate deploy`).
7. `npm run user:create` via SSH.
8. Backup: cron diário de `pg_dump` com rotação de 7 dias.
9. **Smoke test**: login pelo celular via HTTPS, criar E-Task, ver no topo,
   marcar subtarefa, conferir progresso; repetir via CLI no Termux.

**Critérios de saída**: smoke test completo passando pelo domínio público.

---

## Fora de escopo desta versão (registrado)

- Notificações/alertas (qualquer canal).
- Multiusuário.
- Offline-first no PWA.
- E2E automatizado do frontend.
- Mover subtarefas entre tasks diferentes.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Renderização de árvore profunda no mobile | Colapso a partir do 4º nível (spec §6) |
| Brute force no login exposto | Rate limit + Argon2id + JWT com segredo forte |
| Perda de dados na VPS | Backup diário com rotação; off-site futuro |
| IP da VPS mudar | Timer do DuckDNS a cada 5 min |
