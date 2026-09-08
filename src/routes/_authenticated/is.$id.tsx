import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { STATUS_LABEL, WORKSHOP, formatDate, statusBadgeClass } from "@/lib/workshop";
import {
  generateServicePdf,
  pdfFileName,
  whatsappLink,
  type ServiceFormData,
} from "@/lib/service-pdf";
import { SignaturePad } from "@/components/SignaturePad";
import {
  ServiceItemsEditor,
  parseServiceItems,
  type ServiceItem,
} from "@/components/ServiceItemsEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, MessageCircle, Play, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/is/$id")({
  head: () => ({
    meta: [
      { title: "İş Emri Detayı — MAKSER FORKLİFT" },
      { name: "description", content: "İş emri detayı, servis formu ve dijital imza." },
      { property: "og:title", content: "İş Emri Detayı — MAKSER FORKLİFT" },
      { property: "og:description", content: "Servis notunu yazın, imzayı alın, formu gönderin." },
    ],
  }),
  component: OrderDetail,
});

type OrderRow = {
  id: string;
  fault_description: string;
  status: string;
  service_note: string;
  signature_data: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  technician_id: string | null;
  service_items: unknown;
  customers: ServiceFormData["customer"] | null;
  technicians: { full_name: string } | null;
};

function OrderDetail() {
  const { id } = Route.useParams();
  const { role } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ServiceItem[] | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const order = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          "id, fault_description, status, service_note, service_items, signature_data, created_at, started_at, completed_at, technician_id, customers(name, company_name, contact_person, phone, email, address, forklift_brand, forklift_model, serial_no), technicians(full_name)",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      const row = data as unknown as OrderRow;
      setNote((prev) => prev || row.service_note);
      setItems((prev) => prev ?? parseServiceItems(row.service_items));
      return row;
    },
  });

  const o = order.data;
  if (order.isLoading) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  if (!o) return <p className="text-sm text-muted-foreground">İş emri bulunamadı.</p>;

  const formData: ServiceFormData = {
    orderNo: o.id.slice(0, 8).toUpperCase(),
    customer: o.customers ?? {
      name: "-",
      phone: "",
      email: "",
      address: "",
      forklift_brand: "",
      forklift_model: "",
      serial_no: "",
    },
    technicianName: o.technicians?.full_name ?? "-",
    faultDescription: o.fault_description,
    serviceNote: note || o.service_note,
    serviceItems: items ?? parseServiceItems(o.service_items),
    signatureData: signature ?? o.signature_data,
    createdAt: o.created_at,
    completedAt: o.completed_at,
  };

  async function startJob() {
    setBusy(true);
    const { error } = await supabase
      .from("work_orders")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("İş başlatıldı");
    void qc.invalidateQueries();
  }

  async function complete() {
    if (!note.trim()) {
      toast.error("Servis notu yazın");
      return;
    }
    if (!signature && !o?.signature_data) {
      toast.error("Müşteri imzası gerekli");
      return;
    }
    setBusy(true);
    try {
      const completedAt = new Date().toISOString();
      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "completed",
          service_note: note.trim(),
          service_items: items ?? [],
          signature_data: signature ?? o?.signature_data ?? null,
          completed_at: completedAt,
        })
        .eq("id", id);
      if (error) throw error;
      if (o?.technician_id) {
        await supabase.from("technicians").update({ status: "available" }).eq("id", o.technician_id);
      }
      await downloadPdf({ ...formData, completedAt });
      toast.success("İş kapatıldı, servis formu hazırlandı");
      void qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem tamamlanamadı");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf(data: ServiceFormData = formData) {
    const pdf = await generateServicePdf(data);
    pdf.save(pdfFileName(data));
  }

  const waMessage = `Merhaba ${formData.customer.name}, ${WORKSHOP.name} servis ekibi olarak forkliftinize (${formData.customer.forklift_brand} ${formData.customer.forklift_model}) yaptığımız işlemler tamamlanmıştır. Teknik servis formunuz ektedir. İyi çalışmalar dileriz. ${WORKSHOP.phone}`;

  const canEdit = role === "technician" || role === "admin";

  return (
    <div className="space-y-5">
      <Link
        to={role === "admin" ? "/panel" : "/gorevlerim"}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Geri
      </Link>

      <div className="rounded-xl border bg-card p-4 shadow-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-extrabold">{formData.customer.name}</h1>
            <p className="text-sm text-muted-foreground">
              {formData.customer.forklift_brand} {formData.customer.forklift_model} ·{" "}
              {formData.customer.serial_no || "Seri no yok"}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass(o.status)}`}
          >
            {STATUS_LABEL[o.status as keyof typeof STATUS_LABEL] ?? o.status}
          </span>
        </div>

        <dl className="mt-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          <Row label="Telefon" value={formData.customer.phone} href={`tel:${formData.customer.phone}`} />
          <Row label="E-posta" value={formData.customer.email} />
          <Row label="Adres" value={formData.customer.address} />
          <Row label="Teknisyen" value={formData.technicianName} />
          <Row label="Açılış" value={formatDate(o.created_at)} />
          <Row label="Tamamlanma" value={formatDate(o.completed_at)} />
        </dl>

        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Arıza Tanımı
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{o.fault_description}</p>
        </div>
      </div>

      {o.status === "pending" && canEdit && (
        <Button className="w-full" size="lg" onClick={startJob} disabled={busy}>
          <Play className="mr-2 size-4" /> İşe Başla
        </Button>
      )}

      {o.status === "in_progress" && canEdit && (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-panel">
          <h2 className="font-display text-lg font-bold">Servis Formu</h2>
          <div className="space-y-1.5">
            <Label htmlFor="not">Yapılan İşlemler (Servis Notu)</Label>
            <Textarea
              id="not"
              rows={5}
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn: Hidrolik hortum değişimi yapıldı, yağ seviyesi tamamlandı…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dijital İmza (Müşteri)</Label>
            <SignaturePad onChange={setSignature} />
          </div>
          <Button className="w-full" size="lg" onClick={complete} disabled={busy}>
            <Check className="mr-2 size-4" /> {busy ? "İşleniyor…" : "Onayla ve Kapat"}
          </Button>
        </div>
      )}

      {o.status === "completed" && (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-panel">
          <h2 className="font-display text-lg font-bold">Tamamlanan Servis</h2>
          <p className="whitespace-pre-wrap text-sm">{o.service_note}</p>
          {o.signature_data && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Müşteri İmzası
              </div>
              <img
                src={o.signature_data}
                alt={`${formData.customer.name} dijital imzası`}
                className="mt-2 h-28 rounded-lg border bg-background object-contain p-2"
              />
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => void downloadPdf()}>
              <Download className="mr-2 size-4" /> Servis Formu PDF
            </Button>
            <Button asChild variant="secondary" className="flex-1">
              <a
                href={whatsappLink(formData.customer.phone, waMessage)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 size-4" /> WhatsApp'tan Gönder
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            PDF cihazınıza indirilir; WhatsApp penceresinde mesajın yanına ekleyebilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex gap-2 border-b py-1 last:border-0">
      <dt className="w-28 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">
        {href && value ? (
          <a className="text-primary underline-offset-2 hover:underline" href={href}>
            {value}
          </a>
        ) : (
          value || "-"
        )}
      </dd>
    </div>
  );
}
