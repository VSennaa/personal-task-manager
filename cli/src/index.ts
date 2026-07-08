#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { loginCommand } from "./commands/login.js";
import { listCommand } from "./commands/list.js";
import { addCommand } from "./commands/add.js";
import { doneCommand } from "./commands/done.js";
import { subAddCommand } from "./commands/sub-add.js";
import { subDoneCommand } from "./commands/sub-done.js";
import { rmCommand } from "./commands/rm.js";

const program = new Command();

program.name("task").description("CLI do Task Manager pessoal").version("0.1.0");

program
  .command("login")
  .description("autentica e salva o token localmente")
  .argument("<username>", "usuário")
  .argument("<password>", "senha")
  .option("--api-url <url>", "URL base da API (persistida na config)")
  .action(withErrorHandling(loginCommand));

program
  .command("list")
  .description("lista as tarefas na ordem padrão (E > M > S)")
  .action(withErrorHandling(listCommand));

program
  .command("add")
  .description("cria uma nova tarefa")
  .argument("<title>", "título da tarefa")
  .requiredOption("-t, --type <type>", "tipo: E, M ou S")
  .option("-d, --deadline <iso>", "deadline em ISO 8601 (obrigatório para E/M)")
  .action(withErrorHandling(addCommand));

program
  .command("done")
  .description("marca uma tarefa como concluída")
  .argument("<id>", "id da tarefa")
  .action(withErrorHandling(doneCommand));

program
  .command("rm")
  .description("remove uma tarefa e suas subtarefas")
  .argument("<id>", "id da tarefa")
  .action(withErrorHandling(rmCommand));

const sub = program.command("sub").description("subtarefas");

sub
  .command("add")
  .description("cria uma subtarefa")
  .argument("<taskId>", "id da task raiz")
  .argument("<title>", "título da subtarefa")
  .option("--parent <id>", "id da subtarefa pai (aninhamento)")
  .action(withErrorHandling(subAddCommand));

sub
  .command("done")
  .description("marca uma subtarefa como concluída")
  .argument("<id>", "id da subtarefa")
  .action(withErrorHandling(subDoneCommand));

function withErrorHandling<Args extends unknown[]>(
  fn: (...args: Args) => Promise<void>,
): (...args: Args) => Promise<void> {
  return async (...args: Args) => {
    try {
      await fn(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Erro: ${message}`));
      process.exitCode = 1;
    }
  };
}

program.parseAsync(process.argv);
