import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { maintenanceState, maintenanceSummary, formatHours } from "@/lib/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/_authenticated/periyodik-bakimlar")({
  head: () => ({
    meta: [
      { title: "Periyodik Bakımlar — MAKSER FORKLİFT" },
      {
        name: "description",
        content: "250 saat veya 3 ay kuralına göre bakımı yaklaşan forkliftlerin listesi.",
      },
      { property: "og:title", content: "Periyodik Bakımlar — MAKSER FORKLİFT" },
      {
        property: "og:description",
        content: "Bakım zamanı gelen makineleri görün ve tek dokunuşla iş emri açın.",
      },
    ],
  }),
  component: MaintenancePage,
});

type MachineRow = {
  id: string;
  customer_id: string;
  code: string;
  brand: string;
  model: string;
  serial_no: string;
  fuel_type: string;
  hour_meter: number | null;
  last_service_at: string | null;
  last_service_hours: number | null;
  service_interval_hours: number | null;
  service_interval_months: number | null;
  customers: { name: string; company_name: string; phone: string } | null;
};

function MaintenancePage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [search, setSearch] = useState("");

  const machines = useQuery({
    queryKey: ["maintenance-machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forklifts")
        .select(
          "id, customer_id, code, brand, model, serial_no, fuel_type, hour_meter, last_service_at, last_service_hours, service_interval_hours, service_interval_months, customers(name, company_name, phone)",
        )
        .order("code");
      if (error) throw error;
      return (data ?? []) as unknown as MachineRow[];
    },
  });

  const q = search.trim().toLocaleLowerCase("tr-TR");
  const list = (machines.data ?? [])
    .filter((m) =>
      !q
        ? true
        : [m.code, m.brand, m.model, m.serial_no, m.customers?.company_name, m.customers?.name]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("tr-TR")
            .includes(q),
    )
    .map((m) => ({ m, s: maintenanceState(m) }))
    .sort((a, b) => {
      const rank = (x: typeof a) => (x.s.overdue ? 0 : x.s.soon ? 1 : 2);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return a.s.hoursLeft - b.s.hoursLeft;
    });

  const overdue = list.filter((x) => x.s.overdue).length;
  const soon = list.filter((x) => x.s.soon).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Periyodik Bakımlar</h1>
        <p className="text-sm text-muted-foreground">
          Her {250} saat veya son bakımdan 3 ay sonra hatırlatma. Bakımı geçenler en üstte.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Bakım zamanı geldi" value={overdue} tone="text-destructive" />
        <Stat label="Yaklaşıyor" value={soon} tone="text-warning-foreground" />
        <Stat label="Toplam makine" value={list.length} tone="" />
      </div>

      <Input
        placeholder="Makine kimliği, marka, müşteri ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {machines.isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Kayıtlı makine bulunamadı.</p>
      ) : (
        <ul className="space-y-2">
          {list.map(({ m, s }) => (
            <li key={m.id} className="rounded-xl border bg-card p-4 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-steel px-1.5 py-0.5 font-mono text-[11px] font-bold text-steel-foreground">
                      {m.code}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.toneClass}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-1 font-display text-base font-bold">
                    {m.customers?.company_name || m.customers?.name || "Müşteri yok"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {[m.brand, m.model, m.serial_no].filter(Boolean).join(" · ") ||
                      "Makine bilgisi yok"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{maintenanceSummary(m)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Hedef: {formatHours(s.nextHours)} saat · Aralık: {s.intervalHours} saat /{" "}
                    {s.intervalMonths} ay
                  </p>
                </div>
                {isAdmin && <CreateMaintenanceOrder machine={m} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center shadow-panel">
      <div className={`font-display text-xl font-extrabold ${tone}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function CreateMaintenanceOrder({ machine }: { machine: MachineRow }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const { data: me } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("work_orders")
      .insert({
        customer_id: machine.customer_id,
        forklift_id: machine.id,
        fault_description: `PERİYODİK BAKIM · ${machine.code} · ${
          machine.service_interval_hours ?? 250
        } SAAT / ${machine.service_interval_months ?? 3} AY`,
        status: "pending",
        created_by: me.user?.id ?? null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bakım iş emri oluşturuldu");
    void navigate({ to: "/is/$id", params: { id: data.id } });
  }

  return (
    <Button size="sm" disabled={busy} onClick={() => void create()}>
      <Wrench className="mr-1 size-3.5" />
      {busy ? "Oluşturuluyor…" : "Bakım İş Emri"}
    </Button>
  );
}
