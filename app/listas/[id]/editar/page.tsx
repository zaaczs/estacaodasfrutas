"use client";

import { useParams } from "next/navigation";
import { businessTodayInput } from "@/lib/lists/businessDate";
import { ListEditor } from "../../ListEditor";

export default function EditarListaPage() {
  const params = useParams<{ id: string }>();
  return <ListEditor mode="edit" listId={params.id} initialDate={businessTodayInput()} />;
}
