import Link from "next/link";
import { getOrders } from "@/lib/services/orderService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PedidosTable } from "./PedidosTable";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

type PageProps = {
  searchParams?: {
    date?: string;
  };
};

function toInputDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseSelectedDate(dateRaw?: string): Date {
  if (!dateRaw) return new Date();
  const date = new Date(`${dateRaw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function shiftDate(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function PedidosPage({ searchParams }: PageProps) {
  const selectedDate = parseSelectedDate(searchParams?.date);
  const selectedDateInput = toInputDate(selectedDate);
  const previousDateInput = toInputDate(shiftDate(selectedDate, -1));
  const nextDateInput = toInputDate(shiftDate(selectedDate, 1));

  const orders = await getOrders({
    dateFrom: selectedDate,
    dateTo: selectedDate,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">
            Gerencie os pedidos do hortifruti
          </p>
        </div>
        <Link href="/pedidos/novo" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo pedido (adm)
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Lista de pedidos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Exibindo pedidos de {selectedDate.toLocaleDateString("pt-BR")}
              </p>
            </div>

            <form className="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
              <div className="flex items-end gap-2">
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 md:h-10 md:w-10" asChild>
                  <Link href={`/pedidos?date=${previousDateInput}`} title="Dia anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </Button>

                <div className="min-w-0 flex-1 sm:w-[180px] sm:flex-none">
                  <label
                    htmlFor="date"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Data
                  </label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={selectedDateInput}
                    className="w-full sm:w-[180px]"
                  />
                </div>

                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 md:h-10 md:w-10" asChild>
                  <Link href={`/pedidos?date=${nextDateInput}`} title="Próximo dia">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button type="submit" className="h-11 md:h-10">Filtrar</Button>
                <Button type="button" variant="outline" className="h-11 md:h-10" asChild>
                  <Link href={`/pedidos?date=${toInputDate(new Date())}`}>Hoje</Link>
                </Button>
              </div>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <PedidosTable orders={orders} />
        </CardContent>
      </Card>
    </div>
  );
}
