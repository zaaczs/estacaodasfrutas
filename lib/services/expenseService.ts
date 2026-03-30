import { prisma } from "@/lib/db";

export type CreateExpenseInput = {
  description: string;
  category?: string;
  amount: number;
  date: string | Date;
};

function getExpenseDelegate() {
  return (prisma as unknown as {
    expense?: {
      findMany: (...args: unknown[]) => Promise<unknown[]>;
      create: (...args: unknown[]) => Promise<unknown>;
      delete: (...args: unknown[]) => Promise<unknown>;
      aggregate: (...args: unknown[]) => Promise<{ _sum?: { amount?: number | null } }>;
    };
  }).expense;
}

export async function getExpenses() {
  const expense = getExpenseDelegate();
  if (!expense) return [];
  return expense.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  }) as Promise<
    Array<{
      id: string;
      description: string;
      category: string | null;
      amount: number;
      date: Date;
      createdAt: Date;
    }>
  >;
}

export async function createExpense(input: CreateExpenseInput) {
  const expense = getExpenseDelegate();
  if (!expense) {
    throw new Error("ExpenseModelUnavailable");
  }
  return expense.create({
    data: {
      description: input.description,
      category: input.category || null,
      amount: Number(input.amount),
      date: new Date(input.date),
    },
  }) as Promise<{
    id: string;
    description: string;
    category: string | null;
    amount: number;
    date: Date;
    createdAt: Date;
  }>;
}

export async function deleteExpense(id: string) {
  const expense = getExpenseDelegate();
  if (!expense) {
    throw new Error("ExpenseModelUnavailable");
  }
  return expense.delete({ where: { id } }) as Promise<unknown>;
}

export async function sumExpensesByPeriod(dateFrom: Date, dateTo: Date) {
  const expense = getExpenseDelegate();
  if (!expense) return 0;
  const result = await expense.aggregate({
    where: { date: { gte: dateFrom, lte: dateTo } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}
