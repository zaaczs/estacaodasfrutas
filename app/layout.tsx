import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Mercadinho Estação das Frutas",
    template: "%s | Estação das Frutas",
  },
  description:
    "Frutas, verduras, mercearia e garrafões de água. Tele entrega em Fortaleza.",
  icons: {
    icon: [
      { url: "/logo.jpg", type: "image/jpeg" },
      { url: "/mercadinho-logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased min-h-screen overflow-x-clip`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
