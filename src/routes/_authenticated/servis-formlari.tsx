import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/workshop";
import { formatTry, itemsTotal, itemsTotalWithVat, vatAmount } from "@/lib/money";
import { type ServiceFormData } from "@/lib/service-pdf";
import { openPdfPreview } from "@/components/PdfPreview";
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
import { Download, Pencil, Check, FileText, Undo2 } from "lucide-react";

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
  quote_items: unknown;
  quote_status: string;
  quote_note: string;
  quote_approved_by: string;
  quote_approved_at: string | null;
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
          "id, fault_description, service_note, service_items, signature_data, signature_name, created_at, completed_at, hour_meter, form_approved, form_approved_at, quote_items, quote_status, quote_note, quote_approved_by, quote_approved_at, customers(name, company_name, contact_person, phone, email, address, forklift_brand, forklift_model, serial_no), forklifts(code, brand, model, serial_no), technicians:technicians!work_orders_technician_id_fkey(full_name)",
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
          Tamamlanan tüm işlerin servis formları. {isAdmin ? "Servis formu müşteri imzasıyla kapanır. Fiyatlandırma için ayrı, imzasız bir teklif oluşturun; teklif onaylanınca iş Onaylı İşler sayfasına geçer." : "Formları görüntüleyip PDF alabilirsiniz."}
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

function buildFormData(row: FormRow, items: ServiceItem[], kind: "service" | "quote") {
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
    serviceNote: row.service_note,
    serviceItems: items,
    signatureData: kind === "quote" ? null : row.signature_data,
    signerName: row.signature_name,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    withPrices: kind === "quote",
    kind,
    quoteNote: row.quote_note,
  } satisfies ServiceFormData;
}

const QUOTE_BADGE: Record<string, [string, string]> = {
  none: ["Teklif yok", "border-border bg-muted text-muted-foreground"],
  draft: ["Teklif hazır · onay bekliyor", "border-warning/40 bg-warning/20 text-warning-foreground"],
  approved: ["Teklif onaylandı", "border-success/30 bg-success/15 text-success-foreground"],
};

function FormCard({ row, isAdmin }: { row: FormRow; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState(row.fault_description);
  const [note, setNote] = useState(row.service_note);
  const serviceItems = parseServiceItems(row.service_items);
  const [items, setItems] = useState<ServiceItem[]>(
    serviceItems.map(({ price: _p, ...rest }) => rest),
  );
  const savedQuote = parseServiceItems(row.quote_items);
  const [quoteItems, setQuoteItems] = useState<ServiceItem[]>(
    savedQuote.length ? savedQuote : serviceItems,
  );
  const [quoteNote, setQuoteNote] = useState(row.quote_note ?? "");
  const [approver, setApprover] = useState(row.quote_approved_by || row.customers?.contact_person || "");

  const status = row.quote_status || "none";
  const total = itemsTotal(savedQuote);

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["service-forms"] });
    void qc.invalidateQueries({ queryKey: ["approved-jobs"] });
    void qc.invalidateQueries({ queryKey: ["order", row.id] });
  }

  async function update(patch: Database["public"]["Tables"]["work_orders"]["Update"], msg: string) {
    setBusy(true);
    const { error } = await supabase.from("work_orders").update(patch).eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success(msg);
    refresh();
    return true;
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    if (await update({ fault_description: fault.trim(), service_note: note.trim(), service_items: items }, "Servis formu güncellendi"))
      setEditOpen(false);
  }

  async function saveQuote(e: React.FormEvent) {
    e.preventDefault();
    const ok = await update(
      {
        quote_items: quoteItems,
        quote_note: quoteNote.trim(),
        quote_status: status === "approved" ? "approved" : "draft",
        quote_created_at: new Date().toISOString(),
      },
      "Teklif kaydedildi",
    );
    if (ok) {
      setQuoteOpen(false);
      openPdfPreview(buildFormData({ ...row, quote_note: quoteNote.trim() }, quoteItems, "quote"));
    }
  }

  async function approve(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    if (
      await update(
        { quote_status: "approved", quote_approved_by: approver.trim(), quote_approved_at: now, form_approved: true, form_approved_at: now },
        "Teklif onaylandı, iş Onaylı İşler sayfasına geçti",
      )
    )
      setApproveOpen(false);
  }

  const customerName = row.customers?.company_name || row.customers?.name || "-";
  const [badge, badgeClass] = QUOTE_BADGE[status] ?? QUOTE_BADGE["none"] ?? ["", ""];

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
            {row.signature_data && (
              <span className="rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                İmzalı
              </span>
            )}
            {isAdmin && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>{badge}</span>
            )}
          </div>
          <div className="mt-1 font-display text-base font-bold">{customerName}</div>
          <div className="text-sm text-muted-foreground">
            {formatDate(row.completed_at ?? row.created_at)} · {row.technicians?.full_name ?? "Teknisyen yok"} ·{" "}
            {serviceItems.length} kalem
            {row.hour_meter ? ` · ${row.hour_meter} sa` : ""}
          </div>
          {isAdmin && total > 0 && (
            <div className="mt-1 font-display text-sm font-extrabold">Teklif: {formatTry(total)}</div>
          )}
          {status === "approved" && row.quote_approved_by && (
            <div className="text-xs text-muted-foreground">
              Onaylayan: {row.quote_approved_by} · {formatDate(row.quote_approved_at)}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => openPdfPreview(buildFormData(row, serviceItems, "service"))}>
            <Download className="mr-1 size-3.5" /> Servis Formu PDF
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/is/$id" params={{ id: row.id }}>İş emri</Link>
          </Button>
          {isAdmin && (
            <>
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost"><Pencil className="mr-1 size-3.5" /> Formu Düzelt</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader><DialogTitle>Servis Formu · #{row.id.slice(0, 8).toUpperCase()}</DialogTitle></DialogHeader>
                  <form onSubmit={saveForm} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`f-${row.id}-fault`}>Arıza Tanımı</Label>
                      <Textarea id={`f-${row.id}-fault`} rows={3} maxLength={2000} value={fault} onChange={(e) => setFault(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Yapılan İşlemler / Değişen Parçalar</Label>
                      <ServiceItemsEditor items={items} onChange={setItems} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`f-${row.id}-note`}>Teknisyen Görüşü / Servis Notu</Label>
                      <Textarea id={`f-${row.id}-note`} rows={4} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>{busy ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}</Button>
                  </form>
                </DialogContent>
              </Dialog>

              {status !== "none" && (
                <Button size="sm" variant="secondary" onClick={() => openPdfPreview(buildFormData(row, savedQuote, "quote"))}>
                  <FileText className="mr-1 size-3.5" /> Teklif PDF
                </Button>
              )}

              <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant={status === "none" ? "default" : "secondary"}>
                    <FileText className="mr-1 size-3.5" /> {status === "none" ? "Teklif Oluştur" : "Teklifi Düzenle"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader><DialogTitle>Fiyat Teklifi · T-{row.id.slice(0, 8).toUpperCase()}</DialogTitle></DialogHeader>
                  <form onSubmit={saveQuote} className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Kalemler servis formundan aktarıldı. Fiyatları girin; teklif imzasız ayrı bir belge olarak oluşturulur, servis formu değişmez.
                    </p>
                    <ServiceItemsEditor items={quoteItems} onChange={setQuoteItems} withPrice />
                    <div className="space-y-1 rounded-lg bg-muted px-3 py-2 text-sm">
                      <div className="flex justify-between text-muted-foreground"><span>Ara Toplam</span><span>{formatTry(itemsTotal(quoteItems))}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>KDV %20</span><span>{formatTry(vatAmount(quoteItems))}</span></div>
                      <div className="flex justify-between border-t pt-1 font-display font-extrabold"><span>KDV Dahil Toplam</span><span>{formatTry(itemsTotalWithVat(quoteItems))}</span></div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`q-${row.id}-note`}>Teklif Notu (opsiyonel)</Label>
                      <Textarea id={`q-${row.id}-note`} rows={3} maxLength={1000} value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} placeholder="ÖRN: FİYATLARA KDV DAHİL DEĞİLDİR" />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>{busy ? "Kaydediliyor…" : "Teklifi Kaydet ve Önizle"}</Button>
                  </form>
                </DialogContent>
              </Dialog>

              {status === "draft" && (
                <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Check className="mr-1 size-3.5" /> Teklif Onaylandı</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Teklif Onayı</DialogTitle></DialogHeader>
                    <form onSubmit={approve} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`a-${row.id}`}>Onaylayan Kişi</Label>
                        <Input id={`a-${row.id}`} required maxLength={80} value={approver} onChange={(e) => setApprover(e.target.value)} />
                      </div>
                      <Button type="submit" className="w-full" disabled={busy}>Onayı Kaydet</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
              {status === "approved" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void update({ quote_status: "draft", quote_approved_at: null, form_approved: false, form_approved_at: null }, "Teklif onayı geri alındı")}
                >
                  <Undo2 className="mr-1 size-3.5" /> Onayı geri al
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
