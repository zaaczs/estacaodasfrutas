import { businessTodayInput } from "@/lib/lists/businessDate";
import { ListsHome } from "./ListsHome";

export default function ListasPage() {
  return <ListsHome initialDate={businessTodayInput()} />;
}
