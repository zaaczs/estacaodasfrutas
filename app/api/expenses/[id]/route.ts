import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteExpense } from "@/lib/services/expenseService";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { id } = await params;
    await deleteExpense(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ExpenseModelUnavailable") {
      return NextResponse.json(
        { error: "Módulo de insumos indisponível. Reinicie o servidor após db:sync." },
        { status: 503 }
      );
    }
    console.error("DELETE /api/expenses/[id]:", error);
    return NextResponse.json({ error: "Erro ao excluir insumo" }, { status: 500 });
  }
}
