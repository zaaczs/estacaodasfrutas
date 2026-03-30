import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createExpense, getExpenses } from "@/lib/services/expenseService";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const expenses = await getExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    if (error instanceof Error && error.message === "ExpenseModelUnavailable") {
      return NextResponse.json(
        { error: "Módulo de insumos indisponível. Reinicie o servidor após db:sync." },
        { status: 503 }
      );
    }
    console.error("GET /api/expenses:", error);
    return NextResponse.json({ error: "Erro ao buscar insumos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const body = (await request.json()) as {
      description?: string;
      category?: string;
      amount?: number;
      date?: string;
    };
    if (!body.description || body.amount == null || !body.date) {
      return NextResponse.json(
        { error: "Campos obrigatórios: description, amount, date" },
        { status: 400 }
      );
    }
    const expense = await createExpense({
      description: body.description,
      category: body.category,
      amount: Number(body.amount),
      date: body.date,
    });
    return NextResponse.json(expense);
  } catch (error) {
    if (error instanceof Error && error.message === "ExpenseModelUnavailable") {
      return NextResponse.json(
        { error: "Módulo de insumos indisponível. Reinicie o servidor após db:sync." },
        { status: 503 }
      );
    }
    console.error("POST /api/expenses:", error);
    return NextResponse.json({ error: "Erro ao criar insumo" }, { status: 500 });
  }
}
