import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/musteriler")({
  head: () => ({
    meta: [
      { title: "Müşteriler — MAKSER FORKLİFT" },
      { name: "description", content: "Kayıtlı müşteriler ve forklift bilgileri." },
      { property: "og:title", content: "Müşteriler — MAKSER FORKLİFT" },
      { property: "og:description", content: "Müşteri ve forklift kayıtlarını yönetin." },
    ],
  }),
  component: CustomersPage,
});

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

function CustomersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const forklifts = useQuery({
    queryKey: ["forklifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forklifts")
        .select("id, customer_id, brand, model, serial_no")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
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
                  ["company_name", "Firma Ünvanı *", "sm:col-span-2"],
                  ["contact_person", "Yetkili Kişi", ""],
                  ["phone", "Telefon", ""],
                  ["email", "E-posta", ""],
                  ["address", "Adres", "sm:col-span-2"],
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
          <div key={c.id} className="rounded-xl border bg-card p-4 shadow-panel">
            <div className="font-display text-base font-bold">{c.company_name || c.name}</div>
            <div className="mt-1 grid gap-x-4 gap-y-0.5 text-sm text-muted-foreground sm:grid-cols-2">
              <span>{c.contact_person ? `Yetkili: ${c.contact_person}` : "Yetkili girilmedi"}</span>
              <span>{c.phone || "Telefon yok"}</span>
              <span>{c.email || "E-posta yok"}</span>
              <span className="sm:col-span-2">{c.address}</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Forkliftler
              </div>
              {(forklifts.data ?? []).filter((f) => f.customer_id === c.id).length === 0 ? (
                <p className="text-sm text-muted-foreground">Forklift kaydı yok</p>
              ) : (
                <ul className="text-sm">
                  {(forklifts.data ?? [])
                    .filter((f) => f.customer_id === c.id)
                    .map((f) => (
                      <li key={f.id}>
                        {[f.brand, f.model, f.serial_no].filter(Boolean).join(" · ")}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
