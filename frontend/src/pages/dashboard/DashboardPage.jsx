import { EmptyState, PageHeader } from "../../components/ui";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Ringkasan barang, transaksi, dan COGS tenant Anda." />
      <EmptyState
        title="Ringkasan dashboard belum tersedia"
        description="Endpoint /api/dashboard/summary belum diimplementasikan — menyusul di roadmap Fase 3."
      />
    </div>
  );
}
