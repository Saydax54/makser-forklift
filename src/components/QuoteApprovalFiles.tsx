import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, ImagePlus, Camera, Trash2, X } from "lucide-react";
import { PHOTO_BUCKET } from "@/components/ServicePhotos";

export type ApprovalFile = {
  path: string;
  name: string;
  type: string;
  uploaded_at: string;
};

const ACCEPT = "image/*,application/pdf";

export function parseApprovalFiles(raw: unknown): ApprovalFile[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is ApprovalFile =>
      !!f && typeof f === "object" && typeof (f as ApprovalFile).path === "string",
  );
}

export async function uploadApprovalFiles(workOrderId: string, files: File[]) {
  const out: ApprovalFile[] = [];
  for (const file of files) {
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `teklif-onaylari/${workOrderId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) throw error;
    out.push({
      path,
      name: file.name,
      type: file.type || "image/jpeg",
      uploaded_at: new Date().toISOString(),
    });
  }
  return out;
}

/** Local picker used before the approval is saved. */
export function ApprovalFilePicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  function add(list: FileList | null) {
    if (!list?.length) return;
    onChange([...files, ...Array.from(list)]);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => cameraRef.current?.click()}>
          <Camera className="mr-2 size-4" /> Fotoğraf Çek
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={() => galleryRef.current?.click()}>
          <ImagePlus className="mr-2 size-4" /> Dosya Seç
        </Button>
      </div>
      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="relative overflow-hidden rounded-lg border bg-background">
              {previews[i] ? (
                <img src={previews[i]} alt={f.name} className="h-20 w-full object-cover" />
              ) : (
                <div className="flex h-20 flex-col items-center justify-center gap-1 p-1 text-center text-[10px] text-muted-foreground">
                  <FileText className="size-5" />
                  <span className="line-clamp-2 break-all">{f.name}</span>
                </div>
              )}
              <Button
                type="button"
                size="icon"
                variant="destructive"
                aria-label="Dosyayı çıkar"
                className="absolute right-1 top-1 size-6"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Saved approval documents of a quote, with optional add/remove. */
export function QuoteApprovalGallery({
  workOrderId,
  files,
  editable = false,
  onChanged,
}: {
  workOrderId: string;
  files: ApprovalFile[];
  editable?: boolean;
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const signed = useQuery({
    queryKey: ["quote-approval-files", workOrderId, files.map((f) => f.path).join("|")],
    enabled: files.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(
          files.map((f) => f.path),
          60 * 60,
        );
      if (error) throw error;
      return (data ?? []).map((d) => d.signedUrl ?? "");
    },
  });

  async function save(next: ApprovalFile[]) {
    const { error } = await supabase
      .from("work_orders")
      .update({ quote_approval_files: next })
      .eq("id", workOrderId);
    if (error) throw error;
    onChanged?.();
  }

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      const uploaded = await uploadApprovalFiles(workOrderId, Array.from(list));
      await save([...files, ...uploaded]);
      toast.success("Onay belgesi eklendi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(file: ApprovalFile) {
    if (!window.confirm("Bu onay belgesi silinsin mi?")) return;
    setBusy(true);
    try {
      await supabase.storage.from(PHOTO_BUCKET).remove([file.path]);
      await save(files.filter((f) => f.path !== file.path));
      toast.success("Onay belgesi silindi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi");
    } finally {
      setBusy(false);
    }
  }

  if (!files.length && !editable) return null;
  const urls = signed.data ?? [];

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-dashed p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Onaylı Teklif Belgeleri ({files.length})
        </span>
        {editable && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => void add(e.target.files)}
            />
            <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              <ImagePlus className="mr-1 size-3.5" /> {busy ? "Yükleniyor…" : "Belge Ekle"}
            </Button>
          </>
        )}
      </div>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">Henüz onay belgesi eklenmedi.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {files.map((f, i) => {
            const url = urls[i] ?? "";
            const isImage = f.type.startsWith("image/");
            return (
              <li key={f.path} className="relative overflow-hidden rounded-lg border bg-background">
                <a href={url || undefined} target="_blank" rel="noopener noreferrer">
                  {isImage && url ? (
                    <img src={url} alt="Onaylı teklif" loading="lazy" className="h-20 w-full object-cover" />
                  ) : (
                    <div className="flex h-20 flex-col items-center justify-center gap-1 p-1 text-center text-[10px] text-muted-foreground">
                      <FileText className="size-5" />
                      <span className="line-clamp-2 break-all">{f.name}</span>
                    </div>
                  )}
                </a>
                <span className="block px-1 py-0.5 text-[10px] text-muted-foreground">
                  {new Date(f.uploaded_at).toLocaleDateString("tr-TR")}
                </span>
                {editable && (
                  <Button
                    size="icon"
                    variant="destructive"
                    aria-label="Belgeyi sil"
                    className="absolute right-1 top-1 size-6"
                    disabled={busy}
                    onClick={() => void remove(f)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
