import { getExpenses } from "@/lib/services/expenseService";
import { InsumosClient } from "./InsumosClient";

export default async function InsumosPage() {
  const expenses = await getExpenses();
  return <InsumosClient initialExpenses={expenses} />;
}
