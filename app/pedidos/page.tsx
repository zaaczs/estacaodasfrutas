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
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">
            Gerencie os pedidos do hortifruti
          </p>
        </div>
        <Link href="/pedidos/novo">
          <Button>
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

            <form className="flex flex-wrap items-end gap-2">
              <Button type="button" variant="outline" size="icon" asChild>
                <Link href={`/pedidos?date=${previousDateInput}`} title="Dia anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>

              <div>
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
                  className="w-[180px]"
                />
              </div>

              <Button type="submit">Filtrar</Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/pedidos?date=${toInputDate(new Date())}`}>Hoje</Link>
              </Button>

              <Button type="button" variant="outline" size="icon" asChild>
                <Link href={`/pedidos?date=${nextDateInput}`} title="Próximo dia">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
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
