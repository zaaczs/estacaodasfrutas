import { hash } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

export const ADMIN_EMAIL = "uila.ramos20@gmail.com";
const LEGACY_ADMIN_EMAIL = "admin@gmail.com";

/**
 * Atualiza a conta administradora existente.
 * Não cria uma segunda conta e não altera a senha.
 */
export async function migrateAdminAccount(
  db: PrismaClient
): Promise<"migrated" | "kept" | "conflict" | "missing"> {
  const legacyAdmin = await db.user.findUnique({ where: { email: LEGACY_ADMIN_EMAIL } });
  const namedAdmin = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (legacyAdmin && namedAdmin && legacyAdmin.id !== namedAdmin.id) {
    return "conflict";
  }

  if (legacyAdmin && !namedAdmin) {
    if (legacyAdmin.role !== "ADMIN") return "conflict";
    await db.user.update({
      where: { id: legacyAdmin.id },
      data: {
        email: ADMIN_EMAIL,
        role: "ADMIN",
        name: legacyAdmin.name === "Administrador" ? "Administradora" : legacyAdmin.name,
      },
    });
    return "migrated";
  }

  if (namedAdmin) {
    if (namedAdmin.role !== "ADMIN") return "conflict";
    return "kept";
  }

  return "missing";
}

export async function applyAdminPassword(db: PrismaClient, password: string) {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error("Senha da administradora não informada");
  }

  const admin = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin || admin.role !== "ADMIN") {
    throw new Error("Conta administradora não encontrada");
  }

  await db.user.update({
    where: { id: admin.id },
    data: { password: await hash(trimmed, 12), role: "ADMIN" },
  });
}
