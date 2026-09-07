import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { STATUS_LABEL, formatDate, statusBadgeClass } from "@/lib/workshop";

export const Route = createFileRoute("/_authenticated/gorevlerim")({
  head: () => ({
    meta: [
      { title: "Görevlerim — MAKSER FORKLİFT" },
      { name: "description", content: "Saha teknisyenine atanan forklift servis işleri." },
      { property: "og:title", content: "Görevlerim — MAKSER FORKLİFT" },
      { property: "og:description", content: "Size atanan servis işlerini görüntüleyin." },
    ],
  }),
  component: MyJobs,
});

type Order = {
  id: string;
  fault_description: string;
  status: string;
  created_at: string;
  customers: {
    name: string;
    address: string;
    phone: string;
    forklift_brand: string;
    forklift_model: string;
  } | null;
};

function MyJobs() {
  const { technicianId, loading } = useAuth();

  const orders = useQuery({
    queryKey: ["my-orders", technicianId],
    enabled: !!technicianId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          "id, fault_description, status, created_at, customers(name, address, phone, forklift_brand, forklift_model)",
        )
        .eq("technician_id", technicianId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  if (!loading && !technicianId) {
    return (
      <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Hesabınız bir teknisyen kaydına bağlı değil. Atölye yöneticinizle iletişime geçin.
      </p>
    );
  }

  const list = orders.data ?? [];
  const active = list.filter((o) => o.status !== "completed");
  const done = list.filter((o) => o.status === "completed");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-extrabold">Görevlerim</h1>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Açık İşler ({active.length})
        </h2>
        {active.length === 0 && (
          <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            Şu anda açık işiniz yok.
          </p>
        )}
        {active.map((o) => (
          <JobCard key={o.id} order={o} />
        ))}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Tamamlananlar ({done.length})
          </h2>
          {done.map((o) => (
            <JobCard key={o.id} order={o} />
          ))}
        </section>
      )}
    </div>
  );
}

function JobCard({ order }: { order: Order }) {
  return (
    <Link
      to="/is/$id"
      params={{ id: order.id }}
      className="block rounded-xl border bg-card p-4 shadow-panel transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-base font-bold">{order.customers?.name ?? "-"}</div>
          <div className="text-xs text-muted-foreground">
            {order.customers?.forklift_brand} {order.customers?.forklift_model}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(order.status)}`}
        >
          {STATUS_LABEL[order.status as keyof typeof STATUS_LABEL] ?? order.status}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm">{order.fault_description}</p>
      <div className="mt-2 text-[11px] text-muted-foreground">
        {order.customers?.address} · {formatDate(order.created_at)}
      </div>
    </Link>
  );
}
