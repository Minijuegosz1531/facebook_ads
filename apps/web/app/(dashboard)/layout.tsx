import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-gray-200 p-4">
        <div className="mb-6 text-lg font-bold">Meta Ads</div>
        <nav className="flex flex-col gap-1 text-sm">
          <Link className="rounded px-2 py-1.5 hover:bg-gray-100" href="/campaigns">
            Campañas
          </Link>
          <Link
            className="rounded px-2 py-1.5 hover:bg-gray-100"
            href="/campaigns/new"
            data-testid="nav-new-campaign"
          >
            Nueva campaña
          </Link>
          <Link className="rounded px-2 py-1.5 hover:bg-gray-100" href="/clients">
            Clientes
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
