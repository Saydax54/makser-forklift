import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  WORKSHOP,
  formatDate,
  statusBadgeClass,
} from "@/lib/workshop";
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
import { ServiceTemplatePicker } from "@/components/ServiceTemplatePicker";
import { mergeServiceItems } from "@/lib/service-templates";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { nextServiceText } from "@/lib/maintenance";
import { Textarea } from "@/components/ui/textarea";
import { ServicePhotos } from "@/components/ServicePhotos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowLeftRight,
  Download,
  MessageCircle,
  Play,
  Check,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";

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
  signature_name: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  technician_id: string | null;
  customer_id: string;
  transfer_note: string | null;
  transferred_at: string | null;
  service_items: unknown;
  hour_meter: number | null;
  forklift_id: string | null;
  customers: ServiceFormData["customer"] | null;
  forklifts: {
    id: string;
    code: string;
    brand: string;
    model: string;
    serial_no: string;
    hour_meter: number | null;
    last_service_at: string | null;
    last_service_hours: number | null;
    service_interval_hours: number | null;
    service_interval_months: number | null;
  } | null;
  technicians: { full_name: string } | null;
};

function OrderDetail() {
  const { id } = Route.useParams();
  const { role } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ServiceItem[] | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState<string | null>(null);
  const [hourMeter, setHourMeter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const order = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          "id, fault_description, status, service_note, service_items, signature_data, signature_name, created_at, started_at, completed_at, technician_id, customer_id, transfer_note, transferred_at, hour_meter, forklift_id, customers(name, company_name, contact_person, phone, email, address, forklift_brand, forklift_model, serial_no), forklifts(id, code, brand, model, serial_no, hour_meter, last_service_at, last_service_hours, service_interval_hours, service_interval_months), technicians(full_name)",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      const row = data as unknown as OrderRow;
      setNote((prev) => prev || row.service_note);
      setItems((prev) => prev ?? parseServiceItems(row.service_items));
      setHourMeter((prev) =>
        prev ?? String(row.hour_meter ?? row.forklifts?.hour_meter ?? ""),
      );
      return row;
    },
  });

  const o = order.data;
  if (order.isLoading) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  if (!o) return <p className="text-sm text-muted-foreground">İş emri bulunamadı.</p>;

  const baseCustomer = o.customers ?? {
    name: "-",
    phone: "",
    email: "",
    address: "",
    forklift_brand: "",
    forklift_model: "",
    serial_no: "",
  };

  const formData: ServiceFormData = {
    orderNo: o.id.slice(0, 8).toUpperCase(),
    customer: {
      ...baseCustomer,
      forklift_brand: o.forklifts?.brand || baseCustomer.forklift_brand,
      forklift_model: o.forklifts?.model || baseCustomer.forklift_model,
      serial_no: o.forklifts?.serial_no || baseCustomer.serial_no,
    },
    machineCode: o.forklifts?.code ?? "",
    hourMeter: hourMeter ?? o.hour_meter ?? "",
    nextServiceInfo: o.forklifts
      ? nextServiceText(o.forklifts, Number((hourMeter ?? "").replace(",", ".")) || null)
      : "",
    technicianName: o.technicians?.full_name ?? "-",
    faultDescription: o.fault_description,
    serviceNote: note || o.service_note,
    serviceItems: items ?? parseServiceItems(o.service_items),
    signatureData: signature ?? o.signature_data,
    signerName:
      signerName ?? o.signature_name ?? baseCustomer.contact_person ?? "",
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
    if (!(items ?? []).length && !note.trim()) {
      toast.error("En az bir işlem maddesi ekleyin veya servis notu yazın");
      return;
    }
    const finalSigner = (signerName ?? o?.signature_name ?? "").trim();
    if (!finalSigner) {
      toast.error("İmza sahibinin adı ve soyadı gerekli");
      return;
    }
    if (!signature && !o?.signature_data) {
      toast.error("Müşteri imzası gerekli");
      return;
    }
    const hours = Number((hourMeter ?? "").replace(",", ".")) || null;
    if (o?.forklift_id && !hours) {
      toast.error("Makinenin çalışma saatini (sayaç) girin");
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
          signature_name: finalSigner,
          completed_at: completedAt,
          hour_meter: hours,
        })
        .eq("id", id);
      if (error) throw error;
      if (o?.technician_id) {
        await supabase.from("technicians").update({ status: "available" }).eq("id", o.technician_id);
      }
      if (o?.forklift_id) {
        await supabase
          .from("forklifts")
          .update({
            hour_meter: hours ?? o.forklifts?.hour_meter ?? 0,
            last_service_at: completedAt,
            last_service_hours: hours ?? o.forklifts?.hour_meter ?? 0,
          })
          .eq("id", o.forklift_id);
      }
      await downloadPdf({ ...formData, completedAt, signerName: finalSigner });
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
            <h1 className="font-display text-xl font-extrabold">
              {formData.customer.company_name || formData.customer.name}
            </h1>
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
          <Row label="Yetkili Kişi" value={formData.customer.contact_person ?? ""} />
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

      {o.transferred_at && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <span className="font-bold">Bu iş devredildi.</span>{" "}
          {o.transfer_note ? o.transfer_note : ""}{" "}
          <span className="text-muted-foreground">({formatDate(o.transferred_at)})</span>
        </div>
      )}

      {o.status !== "completed" && canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {o.status === "pending" && (
            <Button className="flex-1" size="lg" onClick={startJob} disabled={busy}>
              <Play className="mr-2 size-4" /> İşe Başla
            </Button>
          )}
          <TransferDialog order={o} />
        </div>
      )}

      {o.status === "in_progress" && canEdit && (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-panel">
          <h2 className="font-display text-lg font-bold">Servis Formu</h2>
          {o.forklift_id && (
            <div className="space-y-1.5 rounded-lg border bg-background p-3">
              <Label htmlFor="sayac">
                Makine Çalışma Saati (Sayaç) {o.forklifts?.code ? `· ${o.forklifts.code}` : ""}
              </Label>
              <Input
                id="sayac"
                type="number"
                inputMode="decimal"
                value={hourMeter ?? ""}
                onChange={(e) => setHourMeter(e.target.value)}
                placeholder="Örn: 1250"
              />
              <p className="text-xs text-muted-foreground">
                Sonraki periyodik bakım:{" "}
                {o.forklifts
                  ? nextServiceText(o.forklifts, Number((hourMeter ?? "").replace(",", ".")) || null)
                  : "-"}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Yapılan İşlemler / Değişen Parçalar</Label>
            <ServiceTemplatePicker
              onApply={(picked) => {
                const merged = mergeServiceItems(items ?? [], picked);
                setItems(merged);
                toast.success("Şablon maddeleri listeye eklendi");
              }}
            />
            <ServiceItemsEditor items={items ?? []} onChange={setItems} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="not">Teknisyen Görüşü / Ek Not</Label>
            <Textarea
              id="not"
              rows={4}
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn: Fren balataları bir sonraki bakımda değişmeli, yağ kaçağı gözlenmedi…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dijital İmza (Müşteri)</Label>
            <SignaturePad
              signerName={signerName ?? o.signature_name ?? formData.customer.contact_person ?? ""}
              onSignerNameChange={setSignerName}
              value={signature ?? o.signature_data}
              onChange={setSignature}
            />
          </div>
          <ServicePhotos
            customerId={o.customer_id}
            forkliftId={o.forklift_id}
            workOrderId={o.id}
            canUpload
            canDelete
            title="Servis Fotoğrafları (makine kartına kaydedilir)"
          />
          <Button className="w-full" size="lg" onClick={complete} disabled={busy}>
            <Check className="mr-2 size-4" /> {busy ? "İşleniyor…" : "Onayla ve Kapat"}
          </Button>
        </div>
      )}

      {o.status === "completed" && (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-panel">
          <h2 className="font-display text-lg font-bold">Tamamlanan Servis</h2>
          {(formData.serviceItems ?? []).length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Yapılan İşlemler / Değişen Parçalar
              </div>
              <ul className="mt-2 divide-y rounded-lg border bg-background">
                {(formData.serviceItems ?? []).map((it, i) => (
                  <li key={`${it.title}-${i}`} className="flex justify-between gap-3 px-3 py-2">
                    <span className="text-sm font-semibold">
                      {i + 1}. {it.title}
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {[it.qty, it.unit].filter(Boolean).join(" ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {o.service_note && <p className="whitespace-pre-wrap text-sm">{o.service_note}</p>}
          {o.signature_data && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Müşteri İmzası
              </div>
              {formData.signerName && (
                <p className="mt-1 text-sm font-semibold">{formData.signerName}</p>
              )}
              <img
                src={o.signature_data}
                alt={`${formData.customer.name} dijital imzası`}
                className="mt-2 h-28 rounded-lg border bg-background object-contain p-2"
              />
            </div>
          )}
          <ServicePhotos
            customerId={o.customer_id}
            forkliftId={o.forklift_id}
            workOrderId={o.id}
            canUpload={canEdit}
            canDelete={role === "admin"}
          />
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

      {role === "admin" && <AdminOrderEditor order={o} />}
    </div>
  );
}

function TransferDialog({ order }: { order: OrderRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");

  const technicians = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("id, full_name, status")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const options = (technicians.data ?? []).filter((t) => t.id !== order.technician_id);

  async function transfer() {
    if (!targetId) {
      toast.error("Devredilecek teknisyeni seçin");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("work_orders")
      .update({
        technician_id: targetId,
        transferred_from: order.technician_id,
        transfer_note: reason.trim(),
        transferred_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    if (!error) {
      if (order.technician_id) {
        await supabase.from("technicians").update({ status: "available" }).eq("id", order.technician_id);
      }
      await supabase.from("technicians").update({ status: "busy" }).eq("id", targetId);
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("İş emri devredildi");
    setOpen(false);
    void qc.invalidateQueries();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1" size="lg" variant="secondary">
          <ArrowLeftRight className="mr-2 size-4" /> Servisi Devret
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Servisi Devret</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="devir-teknisyen">Yeni Teknisyen</Label>
            <select
              id="devir-teknisyen"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Seçiniz…</option>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} {t.status === "available" ? "· Müsait" : "· Görevde"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="devir-not">Devir Notu</Label>
            <Textarea
              id="devir-not"
              rows={3}
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn: PLAN DEĞİŞİKLİĞİ, BAŞKA SAHADA GÖREVLİYİM"
            />
          </div>
          <Button className="w-full" onClick={() => void transfer()} disabled={busy}>
            {busy ? "Devredriliyor…" : "Devret"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminOrderEditor({ order }: { order: OrderRow }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(order.status);
  const [technicianId, setTechnicianId] = useState(order.technician_id ?? "");
  const [fault, setFault] = useState(order.fault_description);
  const [note, setNote] = useState(order.service_note);
  const [items, setItems] = useState<ServiceItem[]>(parseServiceItems(order.service_items));
  const [signerName, setSignerName] = useState(order.signature_name ?? "");
  const [signature, setSignature] = useState<string | null>(order.signature_data);

  const technicians = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("id, full_name, status")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function save() {
    if (!fault.trim()) {
      toast.error("Arıza tanımı boş olamaz");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("work_orders")
      .update({
        status,
        technician_id: technicianId || null,
        fault_description: fault.trim(),
        service_note: note.trim(),
        service_items: items,
        signature_name: signerName.trim(),
        signature_data: signature,
        completed_at:
          status === "completed" ? (order.completed_at ?? new Date().toISOString()) : null,
      })
      .eq("id", order.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("İş emri güncellendi");
    void qc.invalidateQueries();
  }

  async function remove() {
    if (!window.confirm("Bu iş emri kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) return;
    setBusy(true);
    const { error } = await supabase.from("work_orders").delete().eq("id", order.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("İş emri silindi");
    void qc.invalidateQueries();
    void navigate({ to: "/panel", replace: true });
  }

  return (
    <div className="space-y-4 rounded-xl border border-dashed bg-card p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Yönetici Düzenlemesi</h2>
          <p className="text-xs text-muted-foreground">
            Tamamlanmış iş emirlerini de düzenleyebilir veya silebilirsiniz.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
          <Pencil className="mr-1 size-4" /> {open ? "Kapat" : "Düzenle"}
        </Button>
      </div>

      {open && (
        <div className="space-y-4 border-t pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="a-status">Durum</Label>
              <select
                id="a-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-tech">Teknisyen</Label>
              <select
                id="a-tech"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Atanmadı</option>
                {(technicians.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-fault">Arıza Tanımı</Label>
            <Textarea
              id="a-fault"
              rows={3}
              maxLength={1000}
              value={fault}
              onChange={(e) => setFault(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Yapılan İşlemler / Değişen Parçalar</Label>
            <ServiceTemplatePicker
              onApply={(picked) => {
                setItems(mergeServiceItems(items, picked));
                toast.success("Şablon maddeleri listeye eklendi");
              }}
            />
            <ServiceItemsEditor items={items} onChange={setItems} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-note">Teknisyen Görüşü / Ek Not</Label>
            <Textarea
              id="a-note"
              rows={4}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Dijital İmza (Müşteri)</Label>
            <SignaturePad
              signerName={signerName}
              onSignerNameChange={setSignerName}
              value={signature}
              onChange={setSignature}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => void save()} disabled={busy}>
              <Save className="mr-2 size-4" /> {busy ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => void remove()}
              disabled={busy}
            >
              <Trash2 className="mr-2 size-4" /> İş Emrini Sil
            </Button>
          </div>
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

