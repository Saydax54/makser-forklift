import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { WORKSHOP } from "@/lib/workshop";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, fullName } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const links =
    role === "admin"
      ? [
          { to: "/panel", label: "İş Emirleri" },
          { to: "/musteriler", label: "Müşteriler" },
          { to: "/teknisyenler", label: "Teknisyenler" },
          { to: "/ayarlar", label: "Ayarlar" },
        ]
      : [{ to: "/gorevlerim", label: "Görevlerim" }];

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/giris", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-steel text-steel-foreground shadow-panel">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate font-display text-base font-extrabold tracking-tight">
              {WORKSHOP.name}
            </div>
            <div className="truncate text-[11px] text-steel-foreground/60">
              {role === "admin" ? "Yönetici Paneli" : "Saha Teknisyeni"} · {fullName}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Çıkış yap">
            <LogOut className="size-5" />
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-steel-foreground/70 hover:bg-sidebar-accent"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 pb-16">{children}</main>
    </div>
  );
}
