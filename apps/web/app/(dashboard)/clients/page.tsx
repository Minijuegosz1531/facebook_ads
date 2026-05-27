import { ClientsList } from "@/features/clients/components/ClientsList";

export default function ClientsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Clientes</h1>
      <ClientsList />
    </div>
  );
}
