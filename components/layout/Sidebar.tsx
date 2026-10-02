"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  Users,
  HandCoins,
  ClipboardList,
  LogOut,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/insumos", label: "Insumos", icon: HandCoins },
  { href: "/estoque", label: "Estoque", icon: Warehouse },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/fiado", label: "Fiado", icon: ClipboardList },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "ADMIN";
  const visibleItems = navItems.filter((item) => {
    if (item.href === "/dashboard" || item.href === "/fiado") return isAdmin;
    return true;
  });
  const homeHref = isAdmin ? "/dashboard" : "/pedidos";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b px-4 md:px-6">
        <Link
          href={homeHref}
          className="font-semibold text-lg"
          onClick={onNavigate}
        >
          Estação das Frutas
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onNavigate}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onNavigate}
        >
          <ExternalLink className="h-5 w-5 shrink-0" />
          Tela do cliente
        </a>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => {
            onNavigate?.();
            void signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r bg-card print:hidden md:block">
        <SidebarNav />
      </aside>

      {/* Mobile: overlay + drawer */}
      <div
        id="admin-mobile-menu"
        className={cn(
          "fixed inset-0 z-50 print:hidden md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0"
          )}
          aria-label="Fechar menu"
          tabIndex={open ? 0 : -1}
          onClick={onClose}
        />
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-[min(18rem,85vw)] border-r bg-card shadow-lg transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de módulos"
        >
          <SidebarNav onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
