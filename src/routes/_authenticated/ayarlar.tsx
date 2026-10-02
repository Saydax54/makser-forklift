import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from "@/lib/admin.functions";
import { WORKSHOP, DEFAULT_WORKSHOP, applyWorkshopSettings, useWorkshop, type WorkshopSettings } from "@/lib/workshop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ServiceItemsEditor, type ServiceItem } from "@/components/ServiceItemsEditor";
import { FUEL_LABEL, fetchServiceTemplates, type FuelType } from "@/lib/service-templates";
import { UserPlus, Trash2, Save } from "lucide-react";


export const Route = createFileRoute("/_authenticated/ayarlar")({
  head: () => ({
    meta: [
      { title: "Ayarlar — MAKSER FORKLİFT" },
      { name: "description", content: "Yönetici ve teknisyen hesaplarını oluşturun, düzenleyin veya silin." },
      { property: "og:title", content: "Ayarlar — MAKSER FORKLİFT" },
      { property: "og:description", content: "Kullanıcı hesabı yönetimi ve atölye ayarları." },
    ],
  }),
  component: SettingsPage,
});

const empty = { fullName: "", email: "", password: "", phone: "", role: "technician" as const };

function SettingsPage() {
  const { role, loading, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createAccount);
  const update = useServerFn(updateAccount);
  const remove = useServerFn(deleteAccount);
  const fetchAccounts = useServerFn(listAccounts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    fullName: string;
    email: string;
    password: string;
    phone: string;
    role: "admin" | "technician";
  }>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && role !== "admin") void navigate({ to: "/gorevlerim", replace: true });
  }, [loading, role, navigate]);

  const people = useQuery({
    queryKey: ["team"],
    queryFn: () => fetchAccounts(),
    enabled: role === "admin",
  });

  function reset() {
    setEditingId(null);
    setForm(empty);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId && form.password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }
    if (editingId && form.password && form.password.length < 6) {
      toast.error("Yeni şifre en az 6 karakter olmalı");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await update({
          data: {
            userId: editingId,
            email: form.email,
            password: form.password || undefined,
            fullName: form.fullName,
            phone: form.phone,
            role: form.role,
          },
        });
        toast.success("Hesap güncellendi");
      } else {
        await create({ data: form });
        toast.success("Hesap oluşturuldu");
      }
      reset();
      void qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hesap kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount(id: string, name: string) {
    if (!window.confirm(`${name || "Bu kullanıcı"} hesabı kalıcı olarak silinsin mi?`)) return;
    setBusy(true);
    try {
      await remove({ data: { userId: id } });
      if (editingId === id) reset();
      toast.success("Hesap silindi");
      void qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hesap silinemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-extrabold">Ayarlar</h1>

      <section className="rounded-xl border bg-card p-4 shadow-panel">
        <h2 className="font-display text-base font-bold">
          {editingId ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Hesabı"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {editingId
            ? "Ad, iletişim, e-posta ve rolü güncelleyin. Şifre alanını boş bırakırsanız mevcut şifre korunur."
            : "Yönetici veya saha teknisyeni hesabı açın; kullanıcı bu e-posta ve şifreyle giriş yapar."}
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="u-name">Ad Soyad *</Label>
            <Input
              id="u-name"
              value={form.fullName}
              maxLength={120}
              required
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">E-posta *</Label>
            <Input
              id="u-email"
              type="email"
              value={form.email}
              required
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-phone">Telefon</Label>
            <Input
              id="u-phone"
              value={form.phone}
              maxLength={40}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-pass">{editingId ? "Yeni Şifre" : "Şifre *"}</Label>
            <Input
              id="u-pass"
              type="password"
              value={form.password}
              minLength={editingId ? undefined : 6}
              required={!editingId}
              placeholder={editingId ? "Değiştirmek istemiyorsanız boş bırakın" : ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-role">Rol *</Label>
            <select
              id="u-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "technician" })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="technician">Saha Teknisyeni</option>
              <option value="admin">Yönetici</option>
            </select>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" className="flex-1" disabled={busy}>
              {editingId ? (
                <>
                  <Save className="mr-1 size-4" /> {busy ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
                </>
              ) : (
                <>
                  <UserPlus className="mr-1 size-4" /> {busy ? "Oluşturuluyor…" : "Hesabı Oluştur"}
                </>
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={reset}>
                İptal
              </Button>
            )}
          </div>
        </form>
      </section>

      <ServiceTemplatesSection />



      <section className="rounded-xl border bg-card p-4 shadow-panel">
        <h2 className="font-display text-base font-bold">Kullanıcılar</h2>
        <div className="mt-3 space-y-2">
          {(people.data ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.fullName || "İsimsiz"}</div>
                <div className="truncate text-xs lowercase text-muted-foreground">{p.email}</div>
                <div className="truncate text-xs text-muted-foreground">{p.phone || "-"}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">
                  {p.role === "admin" ? "Yönetici" : "Teknisyen"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(p.id);
                    setForm({
                      fullName: p.fullName,
                      email: p.email,
                      password: "",
                      phone: p.phone,
                      role: p.role,
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Düzenle
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || p.id === user?.id}
                  aria-label={`${p.fullName} hesabını sil`}
                  onClick={() => void removeAccount(p.id, p.fullName)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {(people.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Kayıt yok.</p>
          )}
        </div>
      </section>

      <WorkshopSettingsSection />
    </div>
  );
}


function ServiceTemplatesSection() {
  const qc = useQueryClient();
  const templates = useQuery({ queryKey: ["service-templates"], queryFn: fetchServiceTemplates });
  const [name, setName] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("diesel");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function reset() {
    setEditingId(null);
    setName("");
    setFuelType("diesel");
    setDescription("");
    setItems([]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Şablon adı gerekli");
      return;
    }
    if (items.length === 0) {
      toast.error("En az bir bakım kalemi ekleyin");
      return;
    }
    setBusy(true);
    const payload = {
      name: name.trim(),
      fuel_type: fuelType,
      description: description.trim(),
      items,
    };
    const { error } = editingId
      ? await supabase.from("service_templates").update(payload).eq("id", editingId)
      : await supabase.from("service_templates").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "Şablon güncellendi" : "Şablon kaydedildi");
    reset();
    void qc.invalidateQueries({ queryKey: ["service-templates"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("service_templates").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (editingId === id) reset();
    toast.success("Şablon silindi");
    void qc.invalidateQueries({ queryKey: ["service-templates"] });
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-panel">
      <h2 className="font-display text-base font-bold">Hazır Bakım Şablonları</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dizel ve elektrikli forkliftlerin periyodik bakım kalemlerini şablon olarak kaydedin;
        teknisyenler servis formunda tek dokunuşla listeye ekleyebilir.
      </p>

      <div className="mt-3 space-y-2">
        {(templates.data ?? []).map((t) => (
          <div key={t.id} className="rounded-lg border bg-background px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  {FUEL_LABEL[t.fuel_type]} · {t.items.length} kalem
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(t.id);
                    setName(t.name);
                    setFuelType(t.fuel_type);
                    setDescription(t.description);
                    setItems(t.items);
                  }}
                >
                  Düzenle
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`${t.name} şablonunu sil`}
                  onClick={() => void remove(t.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(templates.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz şablon yok.</p>
        )}
      </div>

      <form onSubmit={save} className="mt-4 space-y-3 border-t pt-4">
        <h3 className="text-sm font-bold">
          {editingId ? "Şablonu Düzenle" : "Yeni Şablon Oluştur"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="t-name">Şablon Adı *</Label>
            <Input
              id="t-name"
              value={name}
              maxLength={120}
              required
              placeholder="DİZEL FORKLİFT PERİYODİK BAKIM"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-fuel">Forklift Tipi *</Label>
            <select
              id="t-fuel"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="diesel">Dizel</option>
              <option value="electric">Elektrikli</option>
              <option value="all">Tümü</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-desc">Açıklama</Label>
          <Textarea
            id="t-desc"
            rows={2}
            value={description}
            maxLength={400}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Bakım Kalemleri</Label>
          <ServiceItemsEditor items={items} onChange={setItems} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={busy}>
            <Save className="mr-1 size-4" /> {busy ? "Kaydediliyor…" : "Şablonu Kaydet"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={reset}>
              İptal
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}


const SETTING_FIELDS: { key: keyof WorkshopSettings; label: string; group: string; type?: "text" | "textarea" | "number" | "color" | "email" }[] = [
  { key: "name", label: "Atölye / Firma Adı", group: "Firma Bilgileri" },
  { key: "tagline", label: "Slogan / Alt Başlık", group: "Firma Bilgileri" },
  { key: "phone", label: "Telefon", group: "Firma Bilgileri" },
  { key: "email", label: "E-posta", group: "Firma Bilgileri", type: "email" },
  { key: "website", label: "Web Sitesi", group: "Firma Bilgileri" },
  { key: "address", label: "Adres", group: "Firma Bilgileri", type: "textarea" },
  { key: "taxOffice", label: "Vergi Dairesi", group: "Firma Bilgileri" },
  { key: "taxNo", label: "Vergi No", group: "Firma Bilgileri" },
  { key: "logoUrl", label: "Logo Adresi (https://…)", group: "Servis Formu" },
  { key: "accentColor", label: "Vurgu Rengi", group: "Servis Formu", type: "color" },
  { key: "formTitle", label: "Form Başlığı (fiyatsız)", group: "Servis Formu" },
  { key: "pricedFormTitle", label: "Form Başlığı (fiyatlı)", group: "Servis Formu" },
  { key: "declaration", label: "Müşteri Beyan Metni", group: "Servis Formu", type: "textarea" },
  { key: "footerNote", label: "Alt Bilgi Notu", group: "Servis Formu", type: "textarea" },
  { key: "whatsappTemplate", label: "WhatsApp Mesajı ({musteri}, {atolye}, {telefon})", group: "Mesajlar", type: "textarea" },
  { key: "soonHours", label: "Yaklaşan bakım uyarısı (kalan saat)", group: "Periyodik Bakım", type: "number" },
  { key: "soonDays", label: "Yaklaşan bakım uyarısı (kalan gün)", group: "Periyodik Bakım", type: "number" },
];

function WorkshopSettingsSection() {
  const live = useWorkshop();
  const [form, setForm] = useState<WorkshopSettings>({ ...live });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ ...WORKSHOP }), [live.name, live.phone]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const data = { ...form, soonHours: Number(form.soonHours), soonDays: Number(form.soonDays) };
    const { error } = await supabase.from("app_settings").upsert({ id: 1, data, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return void toast.error(error.message);
    applyWorkshopSettings(data);
    toast.success("Ayarlar kaydedildi");
  }

  const groups = Array.from(new Set(SETTING_FIELDS.map((f) => f.group)));
  return (
    <section className="rounded-xl border bg-card p-4 shadow-panel">
      <h2 className="font-display text-base font-bold">Atölye & Servis Formu Ayarları</h2>
      <p className="text-xs text-muted-foreground">Giriş ekranı, menü, PDF servis formu ve WhatsApp mesajlarında kullanılır.</p>
      <form onSubmit={save} className="mt-3 space-y-5">
        {groups.map((g) => (
          <div key={g}>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">{g}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SETTING_FIELDS.filter((f) => f.group === g).map((f) => {
                const id = `ws-${f.key}`;
                const val = String(form[f.key] ?? "");
                const set = (v: string) => setForm((p) => ({ ...p, [f.key]: v }));
                return (
                  <div key={f.key} className={`space-y-1.5 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                    <Label htmlFor={id}>{f.label}</Label>
                    {f.type === "textarea" ? (
                      <Textarea id={id} rows={2} value={val} onChange={(e) => set(e.target.value)} />
                    ) : (
                      <Input id={id} type={f.type === "number" ? "number" : f.type === "color" ? "color" : f.type === "email" ? "email" : f.key === "logoUrl" || f.key === "website" ? "url" : "text"} value={val} onChange={(e) => set(e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}><Save className="mr-1 size-4" />{busy ? "Kaydediliyor…" : "Ayarları Kaydet"}</Button>
          <Button type="button" variant="ghost" onClick={() => setForm({ ...DEFAULT_WORKSHOP })}>Varsayılana dön</Button>
        </div>
      </form>
    </section>
  );
}
