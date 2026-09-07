import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teknisyenler")({
  head: () => ({
    meta: [
      { title: "Teknisyenler — MAKSER FORKLİFT" },
      { name: "description", content: "Saha teknisyenleri ve müsaitlik durumları." },
      { property: "og:title", content: "Teknisyenler — MAKSER FORKLİFT" },
      { property: "og:description", content: "Teknisyen listesi ve görev durumları." },
    ],
  }),
  component: TechniciansPage,
});

function TechniciansPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const technicians = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase.from("technicians").select("*").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Ad soyad gerekli");
    setBusy(true);
    const { error } = await supabase
      .from("technicians")
      .insert({ full_name: fullName.trim(), phone });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Teknisyen eklendi");
    setFullName("");
    setPhone("");
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ["technicians"] });
  }

  async function toggle(id: string, status: string) {
    const next = status === "available" ? "busy" : "available";
    const { error } = await supabase.from("technicians").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["technicians"] });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold">Teknisyenler</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> Yeni
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni Teknisyen</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-ad">Ad Soyad *</Label>
                <Input
                  id="t-ad"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-tel">Telefon</Label>
                <Input
                  id="t-tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  maxLength={20}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Teknisyenin sahada telefondan giriş yapabilmesi için giriş ekranından kendi
                hesabını oluşturması yeterlidir.
              </p>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {(technicians.data ?? []).length === 0 && (
          <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            Henüz teknisyen yok.
          </p>
        )}
        {(technicians.data ?? []).map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-panel"
          >
            <div>
              <div className="font-display text-base font-bold">{t.full_name}</div>
              <div className="text-sm text-muted-foreground">{t.phone || "Telefon yok"}</div>
            </div>
            <Button
              variant={t.status === "available" ? "secondary" : "outline"}
              size="sm"
              onClick={() => toggle(t.id, t.status)}
            >
              {t.status === "available" ? "Müsait" : "Görevde"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
