import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { WORKSHOP, formatDate } from "@/lib/workshop";
import { formatTry, itemsTotal } from "@/lib/money";
import {
  generateServicePdf,
  pdfFileName,
  whatsappLink,
  type ServiceFormData,
} from "@/lib/service-pdf";
import {
  ServiceItemsEditor,
  parseServiceItems,
  type ServiceItem,
} from "@/components/ServiceItemsEditor";
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
import { Download, MessageCircle, Pencil, Check, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/servis-formlari")({
  head: () => ({
    meta: [
      { title: "Servis Formları — MAKSER FORKLİFT" },
      {
        name: "description",
        content: "Tamamlanan işlerin servis formları, fiyatlandırma ve PDF çıktıları.",
      },
      { property: "og:title", content: "Servis Formları — MAKSER FORKLİFT" },
      {
        property: "og:description",
        content: "Servis formlarını düzenleyin, fiyatlandırın ve PDF olarak paylaşın.",
      },
    ],
  }),
  component: ServiceFormsPage,
});

type FormRow = {
  id: string;
  fault_description: string;
  service_note: string;
  service_items: unknown;
  signature_data: string | null;
  signature_name: string;
  created_at: string;
  completed_at: string | null;
  hour_meter: number | null;
  form_approved: boolean;
  form_approved_at: string | null;
  customers: ServiceFormData["customer"] | null;
  forklifts: { code: string; brand: string; model: string; serial_no: string } | null;
  technicians: { full_name: string } | null;
};

function ServiceFormsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [search, setSearch] = useState("");

  const forms = useQuery({
    queryKey: ["service-forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          "id, fault_description, service_note, service_items, signature_data, signature_name, created_at, completed_at, hour_meter, form_approved, form_approved_at, customers(name, company_name, contact_person, phone, email, address, forklift_brand, forklift_model, serial_no), forklifts(code, brand, model, serial_no), technicians(full_name)",
        )
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FormRow[];
    },
  });

  const list = (forms.data ?? []).filter((f) => {
    const hay = `${f.customers?.company_name ?? ""} ${f.customers?.name ?? ""} ${
      f.forklifts?.code ?? ""
    } ${f.technicians?.full_name ?? ""} ${f.id.slice(0, 8)}`;
    return hay.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr"));
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-extrabold">Servis Formları</h1>
        <p className="text-sm text-muted-foreground">
          Tamamlanan tüm işlerin servis formları. {isAdmin ? "Metinleri düzeltebilir, kalemleri fiyatlandırabilir ve iki ayrı PDF üretebilirsiniz." : "Formları görüntüleyip PDF alabilirsiniz."}
        </p>
      </div>

      <Input
        placeholder="Firma, makine kimliği veya form no ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-2">
        {list.length === 0 && (
          <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            Tamamlanmış servis formu bulunamadı.
          </p>
        )}
        {list.map((f) => (
          <FormCard key={f.id} row={f} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  );
}

function buildFormData(row: FormRow, items: ServiceItem[], note: string, withPrices: boolean) {
  const base =
    row.customers ?? {
      name: "-",
      phone: "",
      email: "",
      address: "",
      forklift_brand: "",
      forklift_model: "",
      serial_no: "",
    };
  return {
    orderNo: row.id.slice(0, 8).toUpperCase(),
    customer: {
      ...base,
      forklift_brand: row.forklifts?.brand || base.forklift_brand,
      forklift_model: row.forklifts?.model || base.forklift_model,
      serial_no: row.forklifts?.serial_no || base.serial_no,
    },
    machineCode: row.forklifts?.code ?? "",
    hourMeter: row.hour_meter ?? "",
    technicianName: row.technicians?.full_name ?? "-",
    faultDescription: row.fault_description,
    serviceNote: note,
    serviceItems: items,
    signatureData: row.signature_data,
    signerName: row.signature_name,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    withPrices,
  } satisfies ServiceFormData;
}

function FormCard({ row, isAdmin }: { row: FormRow; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState(row.fault_description);
  const [note, setNote] = useState(row.service_note);
  const [items, setItems] = useState<ServiceItem[]>(parseServiceItems(row.service_items));

  const savedItems = parseServiceItems(row.service_items);
  const total = itemsTotal(savedItems);

  async function download(withPrices: boolean) {
    setBusy(true);
    try {
      const data = buildFormData(row, savedItems, row.service_note, withPrices);
      const pdf = await generateServicePdf(data);
      pdf.save(pdfFileName(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF oluşturulamadı");
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("work_orders")
      .update({
        fault_description: fault.trim(),
        service_note: note.trim(),
        service_items: items,
      })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Servis formu güncellendi");
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ["service-forms"] });
    void qc.invalidateQueries({ queryKey: ["order", row.id] });
  }

  async function toggleApproved() {
    setBusy(true);
    const next = !row.form_approved;
    const { error } = await supabase
      .from("work_orders")
      .update({
        form_approved: next,
        form_approved_at: next ? new Date().toISOString() : null,
      })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next ? "Form kabul edildi" : "Form kabulü geri alındı");
    void qc.invalidateQueries({ queryKey: ["service-forms"] });
  }

  const customerName = row.customers?.company_name || row.customers?.name || "-";
  const waMessage = `Merhaba ${customerName}, ${WORKSHOP.name} servis ekibi olarak yaptığımız işlemler tamamlanmıştır. Servis formunuz ektedir. ${WORKSHOP.phone}`;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold">
              #{row.id.slice(0, 8).toUpperCase()}
            </span>
            {row.forklifts?.code && (
              <span className="rounded-md bg-steel px-1.5 py-0.5 font-mono text-[11px] font-bold text-steel-foreground">
                {row.forklifts.code}
              </span>
            )}
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                row.form_approved
                  ? "border-success/30 bg-success/15 text-success-foreground"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {row.form_approved ? "Kabul edildi" : "Onay bekliyor"}
            </span>
          </div>
          <div className="mt-1 font-display text-base font-bold">{customerName}</div>
          <div className="text-sm text-muted-foreground">
            {formatDate(row.completed_at ?? row.created_at)} ·{" "}
            {row.technicians?.full_name ?? "Teknisyen yok"} ·{" "}
            {savedItems.length} kalem
            {row.hour_meter ? ` · ${row.hour_meter} sa` : ""}
          </div>
          {total > 0 && (
            <div className="mt-1 font-display text-sm font-extrabold">
              Toplam: {formatTry(total)}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void download(false)}>
            <Download className="mr-1 size-3.5" /> Fiyatsız PDF
          </Button>
          {isAdmin && (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void download(true)}>
              <FileText className="mr-1 size-3.5" /> Fiyatlı PDF
            </Button>
          )}
          {row.customers?.phone && (
            <Button size="sm" variant="secondary" asChild>
              <a
                href={whatsappLink(row.customers.phone, waMessage)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-1 size-3.5" /> WhatsApp
              </a>
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link to="/is/$id" params={{ id: row.id }}>
              İş emri
            </Link>
          </Button>
          {isAdmin && (
            <>
              <Button size="sm" variant={row.form_approved ? "ghost" : "default"} disabled={busy} onClick={() => void toggleApproved()}>
                <Check className="mr-1 size-3.5" />
                {row.form_approved ? "Kabulü geri al" : "Kabul et"}
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Pencil className="mr-1 size-3.5" /> Düzenle & Fiyatla
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      Servis Formu · #{row.id.slice(0, 8).toUpperCase()}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={save} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`f-${row.id}-fault`}>Arıza Tanımı</Label>
                      <Textarea
                        id={`f-${row.id}-fault`}
                        rows={3}
                        maxLength={2000}
                        value={fault}
                        onChange={(e) => setFault(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Yapılan İşlemler / Değişen Parçalar (fiyatlı)</Label>
                      <ServiceItemsEditor items={items} onChange={setItems} withPrice />
                      <p className="text-xs text-muted-foreground">
                        Fiyatlar yalnızca fiyatlı PDF çıktısında görünür; müşteriye giden fiyatsız
                        formda yer almaz.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`f-${row.id}-note`}>Teknisyen Görüşü / Servis Notu</Label>
                      <Textarea
                        id={`f-${row.id}-note`}
                        rows={4}
                        maxLength={2000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
