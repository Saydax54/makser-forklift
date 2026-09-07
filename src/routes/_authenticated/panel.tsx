import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { STATUS_LABEL, STATUS_ORDER, formatDate, statusBadgeClass } from "@/lib/workshop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "İş Emirleri — MAKSER FORKLİFT" },
      { name: "description", content: "Açık, devam eden ve tamamlanan forklift servis iş emirleri." },
      { property: "og:title", content: "İş Emirleri — MAKSER FORKLİFT" },
      { property: "og:description", content: "Saha servis iş emirlerini tek ekrandan takip edin." },
    ],
  }),
  component: Panel,
});

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  forklift_brand: string;
  forklift_model: string;
  serial_no: string;
};

type Technician = { id: string; full_name: string; phone: string; status: string };

type Order = {
  id: string;
  fault_description: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  customers: { name: string; forklift_brand: string; forklift_model: string } | null;
  technicians: { full_name: string } | null;
};

const emptyCustomer = {
  name: "",
  phone: "",
  email: "",
  address: "",
  forklift_brand: "",
  forklift_model: "",
  serial_no: "",
};

function Panel() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && role === "technician") void navigate({ to: "/gorevlerim", replace: true });
  }, [loading, role, navigate]);

  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          "id, fault_description, status, created_at, completed_at, customers(name, forklift_brand, forklift_model), technicians(full_name)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  const technicians = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase.from("technicians").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as Technician[];
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold">İş Emirleri</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> Yeni İş Emri
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Yeni İş Emri</DialogTitle>
            </DialogHeader>
            <NewOrderForm
              customers={customers.data ?? []}
              technicians={technicians.data ?? []}
              onDone={() => {
                setOpen(false);
                void qc.invalidateQueries({ queryKey: ["orders"] });
                void qc.invalidateQueries({ queryKey: ["customers"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STATUS_ORDER.map((status) => {
          const list = (orders.data ?? []).filter((o) => o.status === status);
          return (
            <section key={status} className="rounded-xl border bg-card p-3 shadow-panel">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide">
                  {STATUS_LABEL[status]}
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {list.length}
                </span>
              </header>
              <div className="space-y-2">
                {list.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">Kayıt yok</p>
                )}
                {list.map((o) => (
                  <Link
                    key={o.id}
                    to="/is/$id"
                    params={{ id: o.id }}
                    className="block rounded-lg border bg-background p-3 transition-colors hover:border-primary"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{o.customers?.name ?? "-"}</span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(o.status)}`}
                      >
                        {STATUS_LABEL[o.status as keyof typeof STATUS_LABEL] ?? o.status}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {o.fault_description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                      <span>{o.technicians?.full_name ?? "Atanmadı"}</span>
                      <span>{formatDate(o.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function NewOrderForm({
  customers,
  technicians,
  onDone,
}: {
  customers: Customer[];
  technicians: Technician[];
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">(customers.length ? "existing" : "new");
  const [customerId, setCustomerId] = useState("");
  const [form, setForm] = useState(emptyCustomer);
  const [fault, setFault] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fault.trim()) {
      toast.error("Arıza tanımı gerekli");
      return;
    }
    setBusy(true);
    try {
      let cid = customerId;
      if (mode === "new") {
        if (!form.name.trim()) throw new Error("Müşteri adı gerekli");
        const { data, error } = await supabase
          .from("customers")
          .insert({ ...form, name: form.name.trim() })
          .select("id")
          .single();
        if (error) throw error;
        cid = data.id;
      }
      if (!cid) throw new Error("Müşteri seçin");

      const { error: orderError } = await supabase.from("work_orders").insert({
        customer_id: cid,
        technician_id: technicianId || null,
        fault_description: fault.trim(),
        status: "pending",
      });
      if (orderError) throw orderError;

      if (technicianId) {
        await supabase.from("technicians").update({ status: "busy" }).eq("id", technicianId);
      }
      toast.success("İş emri oluşturuldu");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İş emri oluşturulamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex rounded-lg bg-muted p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`flex-1 rounded-md py-1.5 ${mode === "existing" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          Kayıtlı Müşteri
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`flex-1 rounded-md py-1.5 ${mode === "new" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          Yeni Müşteri Ekle
        </button>
      </div>

      {mode === "existing" ? (
        <div className="space-y-1.5">
          <Label htmlFor="musteri">Müşteri</Label>
          <select
            id="musteri"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            <option value="">Seçiniz…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.forklift_brand} {c.forklift_model}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["name", "İsim *", "sm:col-span-2"],
              ["phone", "Telefon", ""],
              ["email", "E-posta", ""],
              ["address", "Adres", "sm:col-span-2"],
              ["forklift_brand", "Forklift Marka", ""],
              ["forklift_model", "Model", ""],
              ["serial_no", "Seri No", "sm:col-span-2"],
            ] as const
          ).map(([key, label, cls]) => (
            <div key={key} className={`space-y-1.5 ${cls}`}>
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={form[key]}
                type={key === "email" ? "email" : "text"}
                maxLength={160}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="ariza">Arıza Tanımı *</Label>
        <Textarea
          id="ariza"
          value={fault}
          onChange={(e) => setFault(e.target.value)}
          rows={3}
          maxLength={1000}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="teknisyen">Teknisyen</Label>
        <select
          id="teknisyen"
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Sonra atanacak</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name} {t.status === "available" ? "(Müsait)" : "(Görevde)"}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Kaydediliyor…" : "İş Emrini Oluştur"}
      </Button>
    </form>
  );
}
