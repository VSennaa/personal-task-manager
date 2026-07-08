import { hashPassword } from "../src/domain/password.js";
import { prisma } from "../src/db/client.js";
import { promptHidden, promptVisible } from "./prompt.js";

async function main() {
  const username = await promptVisible("Username: ");
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`usuário "${username}" não encontrado`);
    process.exit(1);
  }

  const password = await promptHidden("Nova password: ");
  const confirm = await promptHidden("Confirme a nova password: ");
  if (password !== confirm) {
    console.error("as senhas não coincidem");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("a senha deve ter ao menos 8 caracteres");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { username }, data: { passwordHash } });

  console.log(`Senha de "${username}" atualizada com sucesso.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
