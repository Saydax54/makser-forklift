import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PenLine, Check, Eraser } from "lucide-react";

type CanvasProps = {
  onDirtyChange: (dirty: boolean) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

function DrawCanvas({ onDirtyChange, canvasRef }: CanvasProps) {
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, rect.width * ratio);
    canvas.height = Math.max(1, rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, [canvasRef]);

  useEffect(() => {
    setup();
    const onResize = () => setup();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [setup]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pad = 1.5;
    return {
      x: Math.min(Math.max(e.clientX - rect.left, pad), rect.width - pad),
      y: Math.min(Math.max(e.clientY - rect.top, pad), rect.height - pad),
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (empty) {
      setEmpty(false);
      onDirtyChange(true);
    }
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setEmpty(true);
    onDirtyChange(false);
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          className="block h-[55vh] max-h-[520px] min-h-[240px] w-full touch-none"
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Müşteri yetkilisi parmağıyla buraya imza atsın
          </span>
        )}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={clear}>
        <Eraser className="mr-2 size-4" /> İmzayı temizle
      </Button>
    </div>
  );
}

type Props = {
  signerName: string;
  onSignerNameChange: (v: string) => void;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
};

export function SignaturePad({ signerName, onSignerNameChange, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !dirty) return;
    onChange(canvas.toDataURL("image/png"));
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="imza-sahibi">İmza Sahibi (Ad Soyad)</Label>
        <Input
          id="imza-sahibi"
          value={signerName}
          maxLength={80}
          onChange={(e) => onSignerNameChange(e.target.value)}
          placeholder="ÖRN: AHMET YILMAZ"
        />
      </div>

      {value ? (
        <div className="space-y-2">
          <img
            src={value}
            alt="Alınan dijital imza"
            className="h-28 w-full rounded-xl border bg-white object-contain p-2"
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
              <PenLine className="mr-2 size-4" /> Yeniden imza al
            </Button>
            <Button type="button" variant="ghost" onClick={() => onChange(null)}>
              <Eraser className="mr-2 size-4" /> Sil
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="w-full"
          disabled={!signerName.trim()}
          onClick={() => {
            setDirty(false);
            setOpen(true);
          }}
        >
          <PenLine className="mr-2 size-4" /> İmza Al
        </Button>
      )}
      {!signerName.trim() && !value && (
        <p className="text-xs text-muted-foreground">
          İmza almak için önce imza sahibinin adını ve soyadını yazın.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[100vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {signerName.trim() || "Müşteri Yetkilisi"} — Dijital İmza
            </DialogTitle>
          </DialogHeader>
          <DrawCanvas canvasRef={canvasRef} onDirtyChange={setDirty} />
          <DialogFooter>
            <Button type="button" size="lg" className="w-full" disabled={!dirty} onClick={save}>
              <Check className="mr-2 size-4" /> İmzayı Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
