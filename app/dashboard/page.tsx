import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Package, ShoppingCart, TrendingUp, HandCoins, Scale } from "lucide-react";
import { OrderStatus, PaymentCategory, PaymentStatus } from "@/lib/constants";
import { SimpleLineChart } from "@/components/dashboard/SimpleLineChart";
import { computeFinancialTotals, getOrderAccountingDate } from "@/lib/services/orderService";

type DashboardPageProps = {
  searchParams?: {
    period?: string;
    month?: string;
    year?: string;
  };
};

type Bucket = {
  label: string;
  from: Date;
  to: Date;
  grossRevenue: number;
  profitSales: number;
  quantity: number;
  expense: number;
};

function parseInteger(value: string | undefined, fallback: number) {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  return n;
}

function monthName(monthIndex: number) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(2026, monthIndex, 1))
    .replace(".", "")
    .toUpperCase();
}

function getPeriodDateRange(period: string, month: number, year: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "weekly") {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { from, to: today };
  }
  if (period === "yearly") {
    return {
      from: new Date(year, 0, 1),
      to: new Date(year, 11, 31),
    };
  }
  return {
    from: new Date(year, month, 1),
    to: new Date(year, month + 1, 0),
  };
}

function buildBuckets(period: string, month: number, year: number): Bucket[] {
  if (period === "yearly") {
    return Array.from({ length: 12 }, (_, idx) => ({
      label: monthName(idx),
      from: new Date(year, idx, 1),
      to: new Date(year, idx + 1, 0, 23, 59, 59, 999),
      grossRevenue: 0,
      profitSales: 0,
      quantity: 0,
      expense: 0,
    }));
  }

  if (period === "weekly") {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(today);
    start.setDate(today.getDate() - 6);

    return Array.from({ length: 7 }, (_, idx) => {
      const day = new Date(start);
      day.setDate(start.getDate() + idx);
      return {
        label: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        from: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
        to: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999),
        grossRevenue: 0,
        profitSales: 0,
        quantity: 0,
        expense: 0,
      };
    });
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, idx) => ({
    label: String(idx + 1).padStart(2, "0"),
    from: new Date(year, month, idx + 1),
    to: new Date(year, month, idx + 1, 23, 59, 59, 999),
    grossRevenue: 0,
    profitSales: 0,
    quantity: 0,
    expense: 0,
  }));
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const now = new Date();
  const period = ["weekly", "monthly", "yearly"].includes(searchParams?.period ?? "")
    ? (searchParams?.period as "weekly" | "monthly" | "yearly")
    : "monthly";
  const selectedYear = parseInteger(searchParams?.year, now.getFullYear());
  const selectedMonth = Math.min(11, Math.max(0, parseInteger(searchParams?.month, now.getMonth())));

  const range = getPeriodDateRange(period, selectedMonth, selectedYear);
  const from = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
  const to = new Date(
    range.to.getFullYear(),
    range.to.getMonth(),
    range.to.getDate(),
    23,
    59,
    59,
    999
  );

  const expenseDelegate = (
    prisma as unknown as {
      expense?: {
        findMany: (args: {
          where: { date: { gte: Date; lte: Date } };
          orderBy: { date: "asc" };
        }) => Promise<Array<{ amount: number; date: Date }>>;
      };
    }
  ).expense;

  const financialOrderWhere = {
    status: OrderStatus.FINISHED,
    OR: [
      {
        paymentCategory: { not: PaymentCategory.FIADO },
        createdAt: { gte: from, lte: to },
      },
      {
        paymentCategory: PaymentCategory.FIADO,
        paymentStatus: PaymentStatus.PAID,
        paidAt: { gte: from, lte: to },
      },
    ],
  };

  const [orders, lowStockProducts, topProducts, expenses] = await Promise.all([
    prisma.order.findMany({
      where: financialOrderWhere,
      include: {
        items: {
          include: {
            product: {
              select: {
                cost: true,
              },
            },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { stock: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: financialOrderWhere,
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    expenseDelegate
      ? expenseDelegate.findMany({
          where: { date: { gte: from, lte: to } },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const lowStock = lowStockProducts.filter((p) => p.stock <= p.minStock);
  const { validOrders, grossRevenue, profitSales } = computeFinancialTotals(orders);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = profitSales - expenseTotal;
  const totalQuantity = validOrders.reduce(
    (sum, order) => sum + order.items.reduce((inner, item) => inner + item.quantity, 0),
    0
  );

  const topProductsWithNames = await Promise.all(
    topProducts.map(async (tp) => {
      const product = await prisma.product.findUnique({
        where: { id: tp.productId },
      });
      return { ...product, quantity: tp._sum.quantity ?? 0 };
    })
  );

  const buckets = buildBuckets(period, selectedMonth, selectedYear);

  for (const order of validOrders) {
    const orderDate = getOrderAccountingDate(order);
    const bucket = buckets.find((b) => orderDate >= b.from && orderDate <= b.to);
    if (!bucket) continue;
    bucket.grossRevenue += order.total;
    bucket.quantity += order.items.reduce((sum, item) => sum + item.quantity, 0);
    const orderCost = order.items.reduce(
      (sum, item) => sum + (item.product?.cost ?? 0) * item.quantity,
      0
    );
    bucket.profitSales += order.total - orderCost;
  }

  for (const expense of expenses) {
    const expenseDate = expense.date;
    const bucket = buckets.find((b) => expenseDate >= b.from && expenseDate <= b.to);
    if (!bucket) continue;
    bucket.expense += expense.amount;
  }

  const revenueSeries = buckets.map((bucket) => ({
    label: bucket.label,
    value: bucket.grossRevenue,
  }));
  const quantitySeries = buckets.map((bucket) => ({
    label: bucket.label,
    value: bucket.quantity,
  }));

  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 4 }, (_, idx) => currentYear - idx);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Olá, {session.user?.name}! Resumo de faturamento, lucro, insumos e volume vendido.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-3 lg:grid-cols-4" method="GET">
            <div>
              <label htmlFor="period" className="text-sm text-muted-foreground mb-1 block">
                Período
              </label>
              <select
                id="period"
                name="period"
                defaultValue={period}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>

            <div>
              <label htmlFor="month" className="text-sm text-muted-foreground mb-1 block">
                Mês
              </label>
              <select
                id="month"
                name="month"
                defaultValue={String(selectedMonth)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {Array.from({ length: 12 }, (_, idx) => (
                  <option key={idx} value={idx}>
                    {new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
                      new Date(2026, idx, 1)
                    )}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="year" className="text-sm text-muted-foreground mb-1 block">
                Ano
              </label>
              <select
                id="year"
                name="year"
                defaultValue={String(selectedYear)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="h-10 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Aplicar filtros
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grossRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {validOrders.length} pedido(s) contabilizado(s) no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro das vendas
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(profitSales)}</div>
            <p className="text-xs text-muted-foreground">
              Faturamento - custo dos produtos vendidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Insumos
            </CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(expenseTotal)}</div>
            <p className="text-xs text-muted-foreground">Total de gastos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro real
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(netProfit)}</div>
            <p className="text-xs text-muted-foreground">Lucro das vendas - insumos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quantidade vendida
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity}</div>
            <p className="text-xs text-muted-foreground">
              Soma dos itens vendidos no período
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento no período</CardTitle>
            <CardDescription>Visual por dia ou mês de acordo com o filtro</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={revenueSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quantidade vendida</CardTitle>
            <CardDescription>Evolução da quantidade total vendida</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={quantitySeries} colorClassName="stroke-emerald-500" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtos com estoque baixo</CardTitle>
            <CardDescription>
              Produtos que precisam de reposição
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto com estoque baixo no momento.
              </p>
            ) : (
              <div className="space-y-3">
                {lowStock.slice(0, 8).map((product) => (
                  <Link
                    key={product.id}
                    href={`/produtos/${product.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.stock} {product.unit} (mín: {product.minStock})
                      </p>
                    </div>
                    <Badge variant="warning">Baixo</Badge>
                  </Link>
                ))}
                {lowStock.length > 8 && (
                  <Link
                    href="/estoque"
                    className="text-sm text-primary hover:underline"
                  >
                    Ver todos ({lowStock.length})
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos mais vendidos no período</CardTitle>
            <CardDescription>
              Top 5 produtos mais vendidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topProductsWithNames.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma venda registrada hoje.
              </p>
            ) : (
              <div className="space-y-3">
                {topProductsWithNames.map((product, idx) => (
                  product && (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-medium w-6">
                          {idx + 1}º
                        </span>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.quantity} {product.unit} vendidos
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
