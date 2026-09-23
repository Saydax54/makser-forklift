import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/workshop";
import { formatTry, itemsTotal } from "@/lib/money";
import { parseServiceItems } from "@/components/ServiceItemsEditor";
import { generateServicePdf, pdfFileName, type ServiceFormData } from "@/lib/service-pdf";
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
import { FileText, Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onayli-isler")({
  head: () => ({
    meta: [
      { title: "Onaylı İşler — MAKSER FORKLİFT" },
      {
        name: "description",
        content: "Müşteri onayı alınmış servis işleri, faturalandırma takibi ve geçmiş kayıtlar.",
      },
      { property: "og:title", content: "Onaylı İşler — MAKSER FORKLİFT" },
      {
        property: "og:description",
        content: "Onaylı işleri faturalandırın ve geçmiş kayıtları inceleyin.",
      },
    ],
  }),
  component: ApprovedJobsPage,
});

type ApprovedRow = {
  id: string;
  fault_description: string;
  service_note: string;
  service_items: unknown;
  signature_data: string | null;
  signature_name: string;
  created_at: string;
  completed_at: string | null;
  form_approved_at: string | null;
  hour_meter: number | null;
  invoice_status: string;
  invoice_no: string | null;
  invoiced_at: string | null;
  invoice_note: string | null;
  customers: {
    name: string;
    company_name: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
    forklift_brand: string;
    forklift_model: string;
    serial_no: string;
  } | null;
  forklifts: { code: string; brand: string; model: string; serial_no: string } | null;
  technicians: { full_name: string } | null;
};

const FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "pending", label: "Fatura Bekliyor" },
  { key: "invoiced", label: "Faturalandı" },
] as const;

function ApprovedJobsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [search, setSearch] = useState("");

  const rows = useQuery({
    queryKey: ["approved-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          "id, fault_description, service_note, service_items, signature_data, signature_name, created_at, completed_at, form_approved_at, hour_meter, invoice_status, invoice_no, invoiced_at, invoice_note, customers(name, company_name, contact_person, phone, email, address, forklift_brand, forklift_model, serial_no), forklifts(code, brand, model, serial_no), technicians(full_name)",
        )
        .eq("form_approved", true)
        .order("form_approved_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ApprovedRow[];
    },
  });

  const all = rows.data ?? [];
  const q = search.trim().toLocaleLowerCase("tr-TR");
  const list = all
    .filter((r) => (filter === "all" ? true : (r.invoice_status || "pending") === filter))
    .filter((r) =>
      !q
        ? true
        : [
            r.customers?.company_name,
            r.customers?.name,
            r.forklifts?.code,
            r.invoice_no,
            r.id.slice(0, 8),
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("tr-TR")
            .includes(q),
    );

  const totalAll = all.reduce((s, r) => s + itemsTotal(parseServiceItems(r.service_items)), 0);
  const totalInvoiced = all
    .filter((r) => r.invoice_status === "invoiced")
    .reduce((s, r) => s + itemsTotal(parseServiceItems(r.service_items)), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Onaylı İşler</h1>
        <p className="text-sm text-muted-foreground">
          Müşteri onayı alınmış servis formları; faturalandırma durumunu buradan takip edin.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Onaylı iş" value={String(all.length)} />
        <Stat label="Onaylı tutar" value={formatTry(totalAll)} />
        <Stat label="Faturalanan" value={formatTry(totalInvoiced)} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "secondary"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Input
        placeholder="Müşteri, makine kimliği veya fatura no ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {rows.isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Kayıt bulunamadı. Servis Formları sayfasından formu "Kabul et" ile onayladığınızda iş
          buraya düşer.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <ApprovedCard key={r.id} row={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center shadow-panel">
      <div className="font-display text-base font-extrabold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ApprovedCard({ row }: { row: ApprovedRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState(row.invoice_no ?? "");
  const [invoicedAt, setInvoicedAt] = useState(
    row.invoiced_at ? row.invoiced_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [invoiceNote, setInvoiceNote] = useState(row.invoice_note ?? "");

  const items = parseServiceItems(row.service_items);
  const total = itemsTotal(items);
  const invoiced = row.invoice_status === "invoiced";

  async function downloadPdf() {
    setBusy(true);
    try {
      const base = row.customers ?? {
        name: "-",
        company_name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        forklift_brand: "",
        forklift_model: "",
        serial_no: "",
      };
      const data: ServiceFormData = {
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
        signatureData: row.signature_data,
        signerName: row.signature_name,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        withPrices: true,
      };
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
        invoice_status: "invoiced",
        invoice_no: invoiceNo.trim(),
        invoiced_at: new Date(`${invoicedAt}T12:00:00`).toISOString(),
        invoice_note: invoiceNote.trim(),
      })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fatura bilgisi kaydedildi");
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ["approved-jobs"] });
  }

  async function revert() {
    setBusy(true);
    const { error } = await supabase
      .from("work_orders")
      .update({ invoice_status: "pending", invoiced_at: null })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fatura durumu geri alındı");
    void qc.invalidateQueries({ queryKey: ["approved-jobs"] });
  }

  return (
    <li className="rounded-xl border bg-card p-4 shadow-panel">
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
                invoiced
                  ? "border-success/30 bg-success/15 text-success-foreground"
                  : "border-warning/40 bg-warning/20 text-warning-foreground"
              }`}
            >
              {invoiced ? "Faturalandı" : "Fatura bekliyor"}
            </span>
          </div>
          <div className="mt-1 font-display text-base font-bold">
            {row.customers?.company_name || row.customers?.name || "-"}
          </div>
          <div className="text-sm text-muted-foreground">
            Onay: {formatDate(row.form_approved_at ?? row.completed_at)} ·{" "}
            {row.technicians?.full_name ?? "Teknisyen yok"} · {items.length} kalem
          </div>
          {total > 0 && (
            <div className="mt-1 font-display text-sm font-extrabold">
              Tutar: {formatTry(total)}
            </div>
          )}
          {invoiced && (
            <div className="text-xs text-muted-foreground">
              Fatura No: {row.invoice_no || "-"} · {formatDate(row.invoiced_at)}
              {row.invoice_note ? ` · ${row.invoice_note}` : ""}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void downloadPdf()}>
            <FileText className="mr-1 size-3.5" /> Fiyatlı PDF
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/is/$id" params={{ id: row.id }}>
              İş emri
            </Link>
          </Button>
          {invoiced ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void revert()}>
              Faturayı geri al
            </Button>
          ) : null}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Receipt className="mr-1 size-3.5" />
                {invoiced ? "Fatura Bilgisi" : "Faturalandır"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Faturalandırma · #{row.id.slice(0, 8).toUpperCase()}</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`inv-${row.id}`}>Fatura No</Label>
                  <Input
                    id={`inv-${row.id}`}
                    value={invoiceNo}
                    maxLength={40}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`invd-${row.id}`}>Fatura Tarihi</Label>
                  <Input
                    id={`invd-${row.id}`}
                    type="date"
                    value={invoicedAt}
                    onChange={(e) => setInvoicedAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`invn-${row.id}`}>Not</Label>
                  <Textarea
                    id={`invn-${row.id}`}
                    rows={3}
                    maxLength={500}
                    value={invoiceNote}
                    onChange={(e) => setInvoiceNote(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Kaydediliyor…" : "Kaydet"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </li>
  );
}
