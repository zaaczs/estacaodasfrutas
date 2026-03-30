import { Sidebar } from "./Sidebar";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64 print:pl-0">{children}</main>
    </div>
  );
}
