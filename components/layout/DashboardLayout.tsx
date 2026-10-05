"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);
  const homeHref = session?.user?.role === "ADMIN" ? "/dashboard" : "/pedidos";

  if (pathname.includes("/print")) {
    return <div className="print-shell bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b bg-card px-3 pt-[env(safe-area-inset-top)] print:hidden lg:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu de módulos"
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href={homeHref} className="truncate font-semibold">
          Estação das Frutas
        </Link>
      </header>

      <Sidebar open={mobileOpen} onClose={closeMobileMenu} />

      <main className="min-w-0 lg:pl-64 print:pl-0">{children}</main>
    </div>
  );
}
