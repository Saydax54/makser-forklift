import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { createAccount } from "@/lib/admin.functions";
import { WORKSHOP } from "@/lib/workshop";
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
      { name: "description", content: "Yönetici ve teknisyen hesaplarını oluşturun, atölye bilgilerini görün." },
      { property: "og:title", content: "Ayarlar — MAKSER FORKLİFT" },
      { property: "og:description", content: "Kullanıcı hesabı oluşturma ve atölye ayarları." },
    ],
  }),
  component: SettingsPage,
});

const empty = { fullName: "", email: "", password: "", phone: "", role: "technician" as const };

function SettingsPage() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createAccount);
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
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        role: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? "technician",
      }));
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }
    setBusy(true);
    try {
      await create({ data: form });
      toast.success("Hesap oluşturuldu");
      setForm(empty);
      void qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hesap oluşturulamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-extrabold">Ayarlar</h1>

      <section className="rounded-xl border bg-card p-4 shadow-panel">
        <h2 className="font-display text-base font-bold">Yeni Kullanıcı Hesabı</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Yönetici veya saha teknisyeni hesabı açın; kullanıcı bu e-posta ve şifreyle giriş yapar.
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
            <Label htmlFor="u-pass">Şifre *</Label>
            <Input
              id="u-pass"
              type="password"
              value={form.password}
              minLength={6}
              required
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
          <Button type="submit" className="sm:col-span-2" disabled={busy}>
            <UserPlus className="mr-1 size-4" /> {busy ? "Oluşturuluyor…" : "Hesabı Oluştur"}
          </Button>
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
                <div className="truncate text-sm font-semibold">{p.full_name || "İsimsiz"}</div>
                <div className="truncate text-xs text-muted-foreground">{p.phone || "-"}</div>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">
                {p.role === "admin" ? "Yönetici" : "Teknisyen"}
              </span>
            </div>
          ))}
          {(people.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Kayıt yok.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-panel">
        <h2 className="font-display text-base font-bold">Atölye Bilgileri</h2>
        <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
          <div>{WORKSHOP.name}</div>
          <div>{WORKSHOP.address}</div>
          <div>{WORKSHOP.phone}</div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          Bu bilgiler servis formu PDF'inin başlığında kullanılır.
        </p>
      </section>
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
