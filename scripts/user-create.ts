import { hashPassword } from "../src/domain/password.js";
import { prisma } from "../src/db/client.js";
import { promptHidden, promptVisible } from "./prompt.js";

async function main() {
  const username = await promptVisible("Username: ");
  if (!username) {
    console.error("username não pode ser vazio");
    process.exit(1);
  }

  const password = await promptHidden("Password: ");
  const confirm = await promptHidden("Confirme a password: ");
  if (password !== confirm) {
    console.error("as senhas não coincidem");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("a senha deve ter ao menos 8 caracteres");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.error(`usuário "${username}" já existe`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { username, passwordHash } });

  console.log(`Usuário "${user.username}" criado com sucesso (id: ${user.id}).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
