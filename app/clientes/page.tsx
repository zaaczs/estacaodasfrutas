import { getCustomers } from "@/lib/services/customerService";
import { CustomersTable } from "./CustomersTable";
import { CustomerModal } from "./CustomerModal";
import { Button } from "@/components/ui/button";

export default async function ClientesPage() {
  const customers = await getCustomers();

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie os clientes
          </p>
        </div>
        <CustomerModal trigger={<Button>Novo cliente</Button>} />
      </div>

      <CustomersTable customers={customers} />
    </div>
  );
}
