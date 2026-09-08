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
import { UserPlus } from "lucide-react";

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
