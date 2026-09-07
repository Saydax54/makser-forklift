import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { WORKSHOP } from "@/lib/workshop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/giris")({
  head: () => ({
    meta: [
      { title: "Giriş — MAKSER FORKLİFT Servis Takip" },
      {
        name: "description",
        content:
          "MAKSER FORKLİFT iş emri ve saha takip sistemine yönetici veya teknisyen hesabınızla giriş yapın.",
      },
      { property: "og:title", content: "Giriş — MAKSER FORKLİFT Servis Takip" },
      {
        property: "og:description",
        content: "Forklift servis iş emirlerini takip etmek için giriş yapın.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && role) {
      void navigate({ to: role === "admin" ? "/panel" : "/gorevlerim", replace: true });
    }
  }, [loading, session, role, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Kayıt alındı. E-postanıza gelen onay bağlantısına tıklayın.");
          setMode("login");
          return;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Giriş yapılamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-plate flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-panel">
        <div className="text-center">
          <h1 className="font-display text-2xl font-extrabold">{WORKSHOP.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{WORKSHOP.tagline}</p>
        </div>

        <div className="mt-6 flex rounded-lg bg-muted p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md py-1.5 ${mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md py-1.5 ${mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            Kayıt Ol
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "signup" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ad">Ad Soyad</Label>
                <Input
                  id="ad"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tel">Telefon</Label>
                <Input
                  id="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  maxLength={20}
                />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="eposta">E-posta</Label>
            <Input
              id="eposta"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sifre">Şifre</Label>
            <Input
              id="sifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Lütfen bekleyin…" : mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
          </Button>
        </form>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          İlk kayıt olan kişi yönetici olur. Sonraki kayıtlar saha teknisyeni olarak eklenir.
        </p>
      </div>
    </div>
  );
}
