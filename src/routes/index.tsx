import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { WORKSHOP } from "@/lib/workshop";
import { Button } from "@/components/ui/button";
import { ClipboardList, PenLine, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MAKSER FORKLİFT — İş Emri ve Saha Takip Sistemi" },
      {
        name: "description",
        content:
          "Forklift servis atölyesi için iş emri oluşturma, saha teknisyeni takibi, dijital imzalı servis formu ve otomatik PDF gönderimi.",
      },
      { property: "og:title", content: "MAKSER FORKLİFT — İş Emri ve Saha Takip Sistemi" },
      {
        property: "og:description",
        content: "İş emri, saha takibi, dijital imza ve otomatik servis formu PDF'i tek yerde.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session && role) {
      void navigate({ to: role === "admin" ? "/panel" : "/gorevlerim", replace: true });
    }
  }, [loading, session, role, navigate]);

  return (
    <div className="grid-plate min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-foreground">
          Saha Servis Yönetimi
        </span>
        <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          {WORKSHOP.name}
          <span className="block text-muted-foreground">İş Emri ve Saha Takibi</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          İş emri açın, sahadaki teknisyene atayın, işin durumunu anlık izleyin. Teknisyen işi
          bitirince müşteri imzasını telefondan alır, servis formu PDF olarak anında hazırlanır.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/giris">Panele Giriş Yap</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={`tel:${WORKSHOP.phoneIntl}`}>{WORKSHOP.phone}</a>
          </Button>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ClipboardList, t: "İş Emri", d: "Müşteri ve teknisyen seçerek saniyeler içinde iş emri açın." },
            { icon: PenLine, t: "Dijital İmza", d: "Müşteri parmağıyla telefondan imzalasın." },
            { icon: FileText, t: "Otomatik PDF", d: "Servis formu hazırlanır, e-posta veya WhatsApp ile gider." },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border bg-card p-5 shadow-panel">
              <c.icon className="size-6 text-primary" />
              <div className="mt-3 font-display text-lg font-bold">{c.t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-xs text-muted-foreground">
          {WORKSHOP.address} · {WORKSHOP.phone}
        </p>
      </div>
    </div>
  );
}
