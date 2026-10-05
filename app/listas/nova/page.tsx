import { businessTodayInput } from "@/lib/lists/businessDate";
import { ListEditor } from "../ListEditor";

export default function NovaListaPage() {
  return <ListEditor mode="create" initialDate={businessTodayInput()} />;
}
