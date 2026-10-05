import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isInternalRole } from "@/lib/constants";

export async function requireInternalUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  if (!isInternalRole(session.user.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Acesso restrito à equipe interna" }, { status: 403 }),
    };
  }

  return { session, error: null };
}
