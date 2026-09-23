import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, ImagePlus, Trash2 } from "lucide-react";

export const PHOTO_BUCKET = "servis-fotograflari";

export type PhotoRow = {
  id: string;
  storage_path: string;
  caption: string;
  created_at: string;
  work_order_id: string | null;
  forklift_id: string | null;
};

type PhotoFilter = { forkliftId?: string | null | undefined; workOrderId?: string | null | undefined };

async function fetchPhotos(filter: PhotoFilter) {
  let q = supabase
    .from("forklift_photos")
    .select("id, storage_path, caption, created_at, work_order_id, forklift_id")
    .order("created_at", { ascending: false });
  if (filter.workOrderId) q = q.eq("work_order_id", filter.workOrderId);
  else if (filter.forkliftId) q = q.eq("forklift_id", filter.forkliftId);
  else return [] as (PhotoRow & { url: string })[];

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as PhotoRow[];
  if (!rows.length) return [] as (PhotoRow & { url: string })[];
  const { data: signed } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      60 * 60,
    );
  return rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? "" }));
}

export function usePhotos(filter: PhotoFilter) {
  return useQuery({
    queryKey: ["forklift-photos", filter.workOrderId ?? "", filter.forkliftId ?? ""],
    queryFn: () => fetchPhotos(filter),
    enabled: Boolean(filter.workOrderId || filter.forkliftId),
  });
}

export function ServicePhotos({
  customerId,
  forkliftId,
  workOrderId,
  canUpload = false,
  canDelete = false,
  title = "Servis Fotoğrafları",
}: {
  customerId?: string | null;
  forkliftId?: string | null;
  workOrderId?: string | null;
  canUpload?: boolean;
  canDelete?: boolean;
  title?: string;
}) {
  const qc = useQueryClient();
  const photos = usePhotos({ forkliftId, workOrderId });
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    if (!customerId) {
      toast.error("Fotoğraf eklemek için müşteri bilgisi gerekli");
      return;
    }
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `${customerId}/${forkliftId ?? "makine-yok"}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
        if (up.error) throw up.error;
        const { data: me } = await supabase.auth.getUser();
        const { error } = await supabase.from("forklift_photos").insert({
          customer_id: customerId,
          forklift_id: forkliftId ?? null,
          work_order_id: workOrderId ?? null,
          storage_path: path,
          uploaded_by: me.user?.id ?? null,
        });
        if (error) throw error;
      }
      toast.success("Fotoğraflar yüklendi");
      void qc.invalidateQueries({ queryKey: ["forklift-photos"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fotoğraf yüklenemedi");
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  async function remove(photo: PhotoRow) {
    if (!window.confirm("Bu fotoğraf silinsin mi?")) return;
    setBusy(true);
    await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
    const { error } = await supabase.from("forklift_photos").delete().eq("id", photo.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fotoğraf silindi");
    void qc.invalidateQueries({ queryKey: ["forklift-photos"] });
  }

  const list = photos.data ?? [];

  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      {canUpload && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="mr-2 size-4" /> Fotoğraf Çek
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => galleryRef.current?.click()}
          >
            <ImagePlus className="mr-2 size-4" /> Galeriden Ekle
          </Button>
        </div>
      )}
      {busy && <p className="text-xs text-muted-foreground">Yükleniyor…</p>}
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">Henüz fotoğraf yok.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {list.map((p) => (
            <li key={p.id} className="relative overflow-hidden rounded-lg border bg-background">
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={p.url}
                  alt="Servis fotoğrafı"
                  loading="lazy"
                  className="h-24 w-full object-cover"
                />
              </a>
              <span className="block px-1 py-0.5 text-[10px] text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString("tr-TR")}
              </span>
              {canDelete && (
                <Button
                  size="icon"
                  variant="destructive"
                  aria-label="Fotoğrafı sil"
                  className="absolute right-1 top-1 size-6"
                  onClick={() => void remove(p)}
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
