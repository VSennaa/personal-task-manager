# CLAUDE.md

Instruções para qualquer instância do Claude (Claude Code ou chat) trabalhando
neste repositório. Leia `spec.md` na raiz antes de qualquer alteração — é a
fonte de verdade do domínio e da arquitetura. `PLANO.md` contém o roadmap por
fases e os casos de teste de cada feature.

## Processo de trabalho (obrigatório)

Este projeto segue **SDD (Spec-Driven Development)** + **TDD**:

1. Toda funcionalidade nova começa por uma seção correspondente em `spec.md`
   (atualizar a spec antes de codar, não depois).
2. Escrever os testes **antes** da implementação. Rodar e confirmar que falham (red).
3. Implementar o mínimo necessário para os testes passarem (green).
4. Refatorar mantendo os testes verdes.
5. Nunca marcar uma tarefa como concluída sem os testes passando.
6. Seguir a ordem de fases do `PLANO.md`; não iniciar uma fase sem os critérios
   de saída da anterior cumpridos.

Não pule a etapa de testes mesmo em mudanças pequenas ou "óbvias".

## Stack (decidida — ver spec.md §3.1)

- **Backend**: Node.js + **Fastify** + Prisma + PostgreSQL.
- **Validação**: Zod — schemas em `/src/domain`, reutilizados por API e CLI.
- **Testes**: **Vitest** + Supertest.
- **Auth**: JWT (segredo em env) + **Argon2id**; usuário criado só via script SSH.
- **CLI**: Commander.js + chalk; consome a API REST (nunca o banco).
- **Web**: React + Vite, mobile-first, PWA leve; desktop secundário.
- **Deploy**: VPS, Docker Compose (caddy + app + db), TLS via Caddy/Let's
  Encrypt no domínio `vsenaa.duckdns.org`.

## Estrutura de pastas

```
/src
  /domain        # regras puras: validação por tipo, ordenação, progresso, anti-ciclo
  /api           # rotas/handlers HTTP (finos) + middleware de auth
  /db            # schema Prisma, migrations, queries
/cli              # cliente CLI (Commander.js)
/web              # frontend React/Vite
/scripts          # user:create, user:password, backup
/tests
  /unit           # regras de domínio
  /integration    # endpoints via Supertest (Postgres de teste)
spec.md
CLAUDE.md
PLANO.md
```

## Regras de domínio importantes (não violar sem atualizar a spec)

- `E-Task` sempre no topo de qualquer listagem padrão, ordenada por deadline.
- `M-Task` exige `deadline`; ordenada por proximidade do deadline.
- `S-Task` não exige `deadline`; ordenação manual por `sort_order`.
- Subtarefas têm **aninhamento infinito**; validar invariante anti-ciclo ao
  mover (`parent_id` novo não pode ser descendente da própria subtarefa).
- **Progresso** = folhas concluídas ÷ total de folhas (cada folha pesa igual,
  em qualquer profundidade). Task sem subtarefas: 0% (ou 100% se `done`).
- Web e CLI **nunca** acessam o Postgres diretamente — sempre via API REST.
- Nenhum endpoint público de cadastro de usuário; provisionamento só via SSH.

## Convenções de código

- TypeScript estrito em backend, CLI e frontend.
- Commits pequenos e atômicos, um por ciclo red-green-refactor quando possível.
- Nenhuma lógica de negócio dentro de handlers HTTP — handlers fazem
  parse/validação (Zod) e chamam funções de `/domain`, que são testadas primeiro.
- Segredos apenas em `.env` (nunca commitado); `.env.example` documentado.

## Comandos

```bash
npm run test              # suíte completa
npm run test:unit
npm run test:integration  # exige Postgres de teste (docker compose)
npm run dev               # API local
npx prisma migrate dev
npm run user:create       # provisiona usuário (rodar via SSH em produção)
npm run user:password     # troca senha
```

## Segurança (não relaxar)

- Rate limit no `/auth/login` (5/min por IP).
- Hash de senha só com Argon2id.
- Firewall da VPS: apenas 22/80/443; Postgres e API nunca expostos.
- TLS obrigatório em produção (Caddy). Nunca servir a app em HTTP puro
  na internet aberta.

## Antes de perguntar ao usuário

Os pontos antes em aberto foram decididos e registrados em `spec.md` §10
(profundidade infinita de subtarefas, regra de progresso por folhas, auth
single-user via SSH, sem notificações, DuckDNS + TLS). Novas ambiguidades de
negócio: sinalizar explicitamente antes de implementar, nunca assumir em
silêncio.
