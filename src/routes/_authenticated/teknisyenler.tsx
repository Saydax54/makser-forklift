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
  const [editingId, setEditingId] = useState<string | null>(null);
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

  function reset() {
    setEditingId(null);
    setFullName("");
    setPhone("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Ad soyad gerekli");
      return;
    }
    setBusy(true);
    const payload = { full_name: fullName.trim(), phone };
    const { error } = editingId
      ? await supabase.from("technicians").update(payload).eq("id", editingId)
      : await supabase.from("technicians").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "Teknisyen güncellendi" : "Teknisyen eklendi");
    reset();
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ["technicians"] });
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`${name} kaydı silinsin mi?`)) return;
    const { error } = await supabase.from("technicians").delete().eq("id", id);
    if (error) {
      toast.error(
        "Bu teknisyene atanmış iş emirleri olduğu için silinemedi. Önce iş emirlerini başka teknisyene aktarın veya silin.",
      );
      return;
    }
    toast.success("Teknisyen silindi");
    void qc.invalidateQueries({ queryKey: ["technicians"] });
  }

  async function toggle(id: string, status: string) {
    const next = status === "available" ? "busy" : "available";
    const { error } = await supabase.from("technicians").update({ status: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["technicians"] });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold">Teknisyenler</h1>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={reset}>
              <Plus className="mr-1 size-4" /> Yeni
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Teknisyeni Düzenle" : "Yeni Teknisyen"}</DialogTitle>
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
                Teknisyenin sahada telefondan giriş yapabilmesi için Ayarlar bölümünden hesap
                oluşturmanız yeterlidir.
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
            <div className="min-w-0">
              <div className="truncate font-display text-base font-bold">{t.full_name}</div>
              <div className="text-sm text-muted-foreground">{t.phone || "Telefon yok"}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant={t.status === "available" ? "secondary" : "outline"}
                size="sm"
                onClick={() => toggle(t.id, t.status)}
              >
                {t.status === "available" ? "Müsait" : "Görevde"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingId(t.id);
                  setFullName(t.full_name);
                  setPhone(t.phone);
                  setOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${t.full_name} kaydını sil`}
                onClick={() => void remove(t.id, t.full_name)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

