import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { maintenanceState, maintenanceSummary } from "@/lib/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { ServicePhotos } from "@/components/ServicePhotos";

export const Route = createFileRoute("/_authenticated/musteriler")({
  head: () => ({
    meta: [
      { title: "Müşteriler — MAKSER FORKLİFT" },
      { name: "description", content: "Kayıtlı müşteriler, makine kimlikleri ve bakım durumu." },
      { property: "og:title", content: "Müşteriler — MAKSER FORKLİFT" },
      { property: "og:description", content: "Müşteri ve makine kayıtlarını yönetin." },
    ],
  }),
  component: CustomersPage,
});

type Customer = {
  id: string;
  name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  forklift_brand: string;
  forklift_model: string;
  serial_no: string;
};

type Forklift = {
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
};

const empty = {
  company_name: "",
  contact_person: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  forklift_brand: "",
  forklift_model: "",
  serial_no: "",
};

const CUSTOMER_FIELDS = [
  ["company_name", "Firma Ünvanı *", "sm:col-span-2"],
  ["contact_person", "Yetkili Kişi", ""],
  ["phone", "Telefon", ""],
  ["email", "E-posta", ""],
  ["address", "Adres", "sm:col-span-2"],
] as const;

function CustomersPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("company_name");
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  const forklifts = useQuery({
    queryKey: ["forklifts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("forklifts").select("*").order("code");
      if (error) throw error;
      return (data ?? []) as Forklift[];
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const company = form.company_name.trim();
    if (!company) {
      toast.error("Firma ünvanı gerekli");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("customers")
      .insert({ ...form, company_name: company, name: company })
      .select("id")
      .single();
    if (!error && data && (form.forklift_brand || form.forklift_model || form.serial_no)) {
      await supabase.from("forklifts").insert({
        customer_id: data.id,
        brand: form.forklift_brand,
        model: form.forklift_model,
        serial_no: form.serial_no,
      });
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Müşteri eklendi");
    setForm(empty);
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ["customers"] });
    void qc.invalidateQueries({ queryKey: ["forklifts"] });
  }

  const list = (customers.data ?? []).filter((c) =>
    `${c.company_name} ${c.name} ${c.contact_person} ${c.phone} ${c.serial_no}`
      .toLocaleLowerCase("tr")
      .includes(search.toLocaleLowerCase("tr")),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold">Müşteriler</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> Yeni
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Yeni Müşteri</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ...CUSTOMER_FIELDS,
                  ["forklift_brand", "Forklift Marka", ""],
                  ["forklift_model", "Model", ""],
                  ["serial_no", "Seri No", "sm:col-span-2"],
                ] as const
              ).map(([key, label, cls]) => (
                <div key={key} className={`space-y-1.5 ${cls}`}>
                  <Label htmlFor={`c-${key}`}>{label}</Label>
                  <Input
                    id={`c-${key}`}
                    type={key === "email" ? "email" : "text"}
                    maxLength={160}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <Button type="submit" className="sm:col-span-2" disabled={busy}>
                {busy ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="İsim, telefon veya seri no ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-2">
        {list.length === 0 && (
          <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            Kayıt bulunamadı.
          </p>
        )}
        {list.map((c) => (
          <CustomerCard
            key={c.id}
            customer={c}
            machines={(forklifts.data ?? []).filter((f) => f.customer_id === c.id)}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}

function CustomerCard({
  customer,
  machines,
  isAdmin,
}: {
  customer: Customer;
  machines: Forklift[];
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: customer.company_name || customer.name,
    contact_person: customer.contact_person,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
  });
  const [newMachine, setNewMachine] = useState({ brand: "", model: "", serial_no: "" });

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["customers"] });
    void qc.invalidateQueries({ queryKey: ["forklifts"] });
    void qc.invalidateQueries({ queryKey: ["orders"] });
  }

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();
    const company = form.company_name.trim();
    if (!company) {
      toast.error("Firma ünvanı gerekli");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("customers")
      .update({ ...form, company_name: company, name: company })
      .eq("id", customer.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Müşteri güncellendi");
    setEditOpen(false);
    refresh();
  }

  async function removeCustomer() {
    const { count } = await supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id);
    if (count && count > 0) {
      toast.error(
        `Bu müşteriye ait ${count} iş emri var. Önce iş emirlerini silin, sonra müşteriyi silebilirsiniz.`,
      );
      return;
    }
    if (
      !window.confirm(
        `${customer.company_name || customer.name} ve tanımlı makineleri kalıcı olarak silinsin mi?`,
      )
    )
      return;
    setBusy(true);
    await supabase.from("forklifts").delete().eq("customer_id", customer.id);
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Müşteri silindi");
    refresh();
  }

  async function addMachine(e: React.FormEvent) {
    e.preventDefault();
    if (!newMachine.brand.trim() && !newMachine.model.trim() && !newMachine.serial_no.trim()) {
      toast.error("Makine bilgilerini girin");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("forklifts").insert({
      customer_id: customer.id,
      brand: newMachine.brand.trim(),
      model: newMachine.model.trim(),
      serial_no: newMachine.serial_no.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Makine eklendi");
    setNewMachine({ brand: "", model: "", serial_no: "" });
    setAddOpen(false);
    refresh();
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-base font-bold">
            {customer.company_name || customer.name}
          </div>
          <div className="mt-1 grid gap-x-4 gap-y-0.5 text-sm text-muted-foreground sm:grid-cols-2">
            <span>
              {customer.contact_person ? `Yetkili: ${customer.contact_person}` : "Yetkili girilmedi"}
            </span>
            <span>{customer.phone || "Telefon yok"}</span>
            <span>{customer.email || "E-posta yok"}</span>
            <span className="sm:col-span-2">{customer.address}</span>
          </div>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-1">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Müşteriyi düzenle">
                  <Pencil className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Müşteriyi Düzenle</DialogTitle>
                </DialogHeader>
                <form onSubmit={saveCustomer} className="grid gap-3 sm:grid-cols-2">
                  {CUSTOMER_FIELDS.map(([key, label, cls]) => (
                    <div key={key} className={`space-y-1.5 ${cls}`}>
                      <Label htmlFor={`e-${customer.id}-${key}`}>{label}</Label>
                      <Input
                        id={`e-${customer.id}-${key}`}
                        type={key === "email" ? "email" : "text"}
                        maxLength={160}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                  <Button type="submit" className="sm:col-span-2" disabled={busy}>
                    {busy ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Müşteriyi sil"
              disabled={busy}
              onClick={() => void removeCustomer()}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Makineler
          </div>
          {isAdmin && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  <Plus className="mr-1 size-3.5" /> Makine
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Yeni Makine</DialogTitle>
                </DialogHeader>
                <form onSubmit={addMachine} className="space-y-3">
                  {(
                    [
                      ["brand", "Marka"],
                      ["model", "Model"],
                      ["serial_no", "Seri No"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={`nm-${customer.id}-${key}`}>{label}</Label>
                      <Input
                        id={`nm-${customer.id}-${key}`}
                        maxLength={80}
                        value={newMachine[key]}
                        onChange={(e) => setNewMachine({ ...newMachine, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                  <Button type="submit" className="w-full" disabled={busy}>
                    Kaydet
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {machines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Makine kaydı yok</p>
        ) : (
          <ul className="space-y-2">
            {machines.map((m) => (
              <MachineRow key={m.id} machine={m} isAdmin={isAdmin} onChanged={refresh} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MachineRow({
  machine,
  isAdmin,
  onChanged,
}: {
  machine: Forklift;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [form, setForm] = useState({
    brand: machine.brand,
    model: machine.model,
    serial_no: machine.serial_no,
    fuel_type: machine.fuel_type || "diesel",
    hour_meter: String(machine.hour_meter ?? 0),
    service_interval_hours: String(machine.service_interval_hours ?? 250),
    service_interval_months: String(machine.service_interval_months ?? 3),
  });
  const state = maintenanceState(machine);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("forklifts")
      .update({
        brand: form.brand.trim(),
        model: form.model.trim(),
        serial_no: form.serial_no.trim(),
        fuel_type: form.fuel_type,
        hour_meter: Number(form.hour_meter.replace(",", ".")) || 0,
        service_interval_hours: Number(form.service_interval_hours) || 250,
        service_interval_months: Number(form.service_interval_months) || 3,
      })
      .eq("id", machine.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Makine güncellendi");
    setOpen(false);
    onChanged();
  }

  async function remove() {
    const { count } = await supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("forklift_id", machine.id);
    if (count && count > 0) {
      toast.error(`Bu makineye ait ${count} iş emri var, silinemez.`);
      return;
    }
    if (!window.confirm(`${machine.code} makinesi silinsin mi?`)) return;
    setBusy(true);
    const { error } = await supabase.from("forklifts").delete().eq("id", machine.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Makine silindi");
    onChanged();
  }

  return (
    <li className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-steel px-1.5 py-0.5 font-mono text-[11px] font-bold text-steel-foreground">
              {machine.code}
            </span>
            <span className="text-sm font-semibold">
              {[machine.brand, machine.model, machine.serial_no].filter(Boolean).join(" · ") ||
                "Bilgisiz makine"}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${state.toneClass}`}
            >
              {state.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{maintenanceSummary(machine)}</p>
          <p className="text-[11px] text-muted-foreground">
            Aralık: {state.intervalHours} saat / {state.intervalMonths} ay
          </p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-1">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Makineyi düzenle">
                  <Pencil className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{machine.code} · Makine Kartı</DialogTitle>
                </DialogHeader>
                <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`m-${machine.id}-brand`}>Marka</Label>
                    <Input
                      id={`m-${machine.id}-brand`}
                      value={form.brand}
                      maxLength={80}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`m-${machine.id}-model`}>Model</Label>
                    <Input
                      id={`m-${machine.id}-model`}
                      value={form.model}
                      maxLength={80}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`m-${machine.id}-serial`}>Seri No</Label>
                    <Input
                      id={`m-${machine.id}-serial`}
                      value={form.serial_no}
                      maxLength={80}
                      onChange={(e) => setForm({ ...form, serial_no: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`m-${machine.id}-fuel`}>Yakıt / Güç</Label>
                    <select
                      id={`m-${machine.id}-fuel`}
                      value={form.fuel_type}
                      onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="diesel">Dizel</option>
                      <option value="electric">Elektrikli</option>
                      <option value="lpg">LPG</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`m-${machine.id}-hours`}>Çalışma Saati</Label>
                    <Input
                      id={`m-${machine.id}-hours`}
                      type="number"
                      value={form.hour_meter}
                      onChange={(e) => setForm({ ...form, hour_meter: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`m-${machine.id}-ih`}>Bakım Aralığı (saat)</Label>
                    <Input
                      id={`m-${machine.id}-ih`}
                      type="number"
                      value={form.service_interval_hours}
                      onChange={(e) =>
                        setForm({ ...form, service_interval_hours: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`m-${machine.id}-im`}>Bakım Aralığı (ay)</Label>
                    <Input
                      id={`m-${machine.id}-im`}
                      type="number"
                      value={form.service_interval_months}
                      onChange={(e) =>
                        setForm({ ...form, service_interval_months: e.target.value })
                      }
                    />
                  </div>
                  <Button type="submit" className="sm:col-span-2" disabled={busy}>
                    {busy ? "Kaydediliyor…" : "Kaydet"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Makineyi sil"
              disabled={busy}
              onClick={() => void remove()}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="mt-3 border-t pt-3">
        <Button size="sm" variant="ghost" onClick={() => setShowPhotos((v) => !v)}>
          <ImageIcon className="mr-1 size-4" />
          {showPhotos ? "Fotoğrafları Gizle" : "Servis Fotoğrafları"}
        </Button>
        {showPhotos && (
          <div className="mt-2">
            <ServicePhotos
              customerId={machine.customer_id}
              forkliftId={machine.id}
              canUpload={isAdmin}
              canDelete={isAdmin}
              title={`${machine.code} · Servis Fotoğrafları`}
            />
          </div>
        )}
      </div>
    </li>
  );
}
