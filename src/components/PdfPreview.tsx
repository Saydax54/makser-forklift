import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Mail, MessageCircle, Printer, Loader2 } from "lucide-react";
import { generateServicePdf, pdfFileName, whatsappLink, type ServiceFormData } from "@/lib/service-pdf";
import { whatsappMessage } from "@/lib/workshop";

type Req = { data: ServiceFormData; title?: string } | null;
let current: Req = null;
const subs = new Set<() => void>();
function set(r: Req) {
  current = r;
  subs.forEach((s) => s());
}

/** PDF'i indirmeden önce önizleme penceresinde açar. */
export function openPdfPreview(data: ServiceFormData, title?: string) {
  set({ data, title });
}

export function PdfPreviewHost() {
  const req = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => current,
    () => null,
  );
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!req) return;
    let alive = true;
    let made: string | null = null;
    setUrl(null);
    generateServicePdf(req.data)
      .then((pdf) => {
        if (!alive) return;
        const b = pdf.output("blob");
        made = URL.createObjectURL(b);
        setBlob(b);
        setUrl(made);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "PDF oluşturulamadı");
        set(null);
      });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [req]);

  if (!req) return null;
  const d = req.data;
  const name = pdfFileName(d);
  const customer = d.customer.company_name || d.customer.name;

  function download() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  function print() {
    const frame = document.getElementById("pdf-preview-frame") as HTMLIFrameElement | null;
    try {
      frame?.contentWindow?.focus();
      frame?.contentWindow?.print();
    } catch {
      if (url) window.open(url, "_blank");
    }
  }

  async function share(kind: "wa" | "mail") {
    if (!blob) return;
    const file = new File([blob], name, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name, text: whatsappMessage(customer) });
        return;
      } catch {
        /* kullanıcı iptal etti */
      }
    }
    download();
    if (kind === "wa") {
      window.open(whatsappLink(d.customer.phone || "", whatsappMessage(customer)), "_blank");
    } else {
      const subject = encodeURIComponent(`${d.kind === "quote" ? "Fiyat Teklifi" : "Servis Formu"} · ${d.orderNo}`);
      const body = encodeURIComponent(`${whatsappMessage(customer)}\n\n(PDF dosyası ektedir: ${name})`);
      window.location.href = `mailto:${d.customer.email || ""}?subject=${subject}&body=${body}`;
    }
    toast.info("PDF indirildi, gönderirken ek olarak ekleyin.");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && set(null)}>
      <DialogContent className="flex h-[95vh] max-w-[100vw] flex-col gap-3 p-3 sm:max-w-4xl sm:p-5">
        <DialogHeader>
          <DialogTitle>{req.title ?? (d.kind === "quote" ? "Fiyat Teklifi" : "Servis Formu")} · {d.orderNo}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted">
          {url ? (
            <iframe id="pdf-preview-frame" src={url} title="PDF önizleme" className="size-full" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Hazırlanıyor…
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button variant="secondary" disabled={!url} onClick={print}>
            <Printer className="mr-1.5 size-4" /> Yazdır
          </Button>
          <Button variant="secondary" disabled={!url} onClick={download}>
            <Download className="mr-1.5 size-4" /> İndir
          </Button>
          <Button variant="secondary" disabled={!url} onClick={() => void share("wa")}>
            <MessageCircle className="mr-1.5 size-4" /> WhatsApp
          </Button>
          <Button variant="secondary" disabled={!url} onClick={() => void share("mail")}>
            <Mail className="mr-1.5 size-4" /> E-posta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
