import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { authOptions } from "@/lib/auth";
import { isInternalRole, Role } from "@/lib/constants";

export async function InternalAppLayout({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!isInternalRole(session.user.role)) redirect("/meus-pedidos");
  if (adminOnly && session.user.role !== Role.ADMIN) redirect("/pedidos");

  return <DashboardLayout>{children}</DashboardLayout>;
}
