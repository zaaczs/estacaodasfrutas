import { getExpenses } from "@/lib/services/expenseService";
import { InsumosClient } from "./InsumosClient";

export default async function InsumosPage() {
  const expenses = (await getExpenses()).map((expense) => ({
    id: expense.id,
    description: expense.description,
    category: expense.category,
    amount: expense.amount,
    date: expense.date.toISOString(),
  }));

  return <InsumosClient initialExpenses={expenses} />;
}
