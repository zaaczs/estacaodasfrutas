"use client";

import { useState, Suspense } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerMode = searchParams.get("customer") === "1";
  const callbackUrl = searchParams.get("callbackUrl") ?? (customerMode ? "/meus-pedidos" : "/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Email ou senha inválidos" : result.error);
        setLoading(false);
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;
      const nextUrl = customerMode && role !== "CUSTOMER" ? "/dashboard" : callbackUrl;

      router.push(nextUrl);
      router.refresh();
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <img
              src="/mercadinho-logo.svg"
              alt="Mercadinho Estação das Frutas"
              className="h-24 w-auto object-contain"
              width={120}
              height={132}
            />
          </div>
          <CardTitle className="text-2xl font-bold">Estação das Frutas</CardTitle>
          <CardDescription>
            {customerMode
              ? "Entre para acompanhar seus pedidos. Se não tiver conta, cadastre-se."
              : "Entre com suas credenciais para acessar o sistema"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            {customerMode && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push("/cadastro-cliente")}
              >
                Criar conta de cliente
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p>Carregando...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
