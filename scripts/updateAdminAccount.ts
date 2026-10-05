import { PrismaClient } from "@prisma/client";
import { applyAdminPassword, migrateAdminAccount } from "../lib/adminAccount";

const prisma = new PrismaClient();

async function main() {
  const result = await migrateAdminAccount(prisma);
  if (result === "conflict") {
    throw new Error("O e-mail novo já pertence a outra conta. Nenhuma alteração foi feita.");
  }
  if (result === "missing") {
    throw new Error("Conta administradora não encontrada.");
  }

  const password = process.env.ADMIN_NEW_PASSWORD?.trim();
  if (password) {
    await applyAdminPassword(prisma, password);
    console.log(result === "migrated" ? "E-mail e senha da administradora atualizados." : "Senha da administradora atualizada.");
    return;
  }

  console.log(
    result === "migrated"
      ? "E-mail da administradora atualizado. A senha anterior foi preservada."
      : "A conta administradora já estava com o e-mail novo. A senha foi preservada."
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : "Falha ao atualizar a conta";
    console.error(message);
    await prisma.$disconnect();
    process.exit(1);
  });
