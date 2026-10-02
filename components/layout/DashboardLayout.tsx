"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-card px-3 print:hidden md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu de módulos"
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="truncate font-semibold">
          Estação das Frutas
        </Link>
      </header>

      <Sidebar open={mobileOpen} onClose={closeMobileMenu} />

      <main className="min-w-0 md:pl-64 print:pl-0">{children}</main>
    </div>
  );
}
