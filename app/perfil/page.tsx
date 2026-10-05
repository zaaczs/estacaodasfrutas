import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CUSTOMER") {
    redirect("/login?customer=1&callbackUrl=/perfil");
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] p-4 md:p-8">
      <div className="mx-auto max-w-xl rounded-xl border bg-white p-6 space-y-3">
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-gray-600">Conta logada com sucesso.</p>
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <p>
            <strong>Nome:</strong> {session.user.name ?? "-"}
          </p>
          <p>
            <strong>Email:</strong> {session.user.email ?? "-"}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/meus-pedidos">Ver meus pedidos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Voltar para loja</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
