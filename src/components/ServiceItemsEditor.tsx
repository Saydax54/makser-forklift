import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export type ServiceItem = { title: string; qty: string; unit: string };

export const UNITS = ["adet", "litre", "takım", "metre", "kg", "saat"];

export function parseServiceItems(value: unknown): ServiceItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => ({
      title: String(i["title"] ?? ""),
      qty: String(i["qty"] ?? ""),
      unit: String(i["unit"] ?? "adet"),
    }))
    .filter((i) => i.title.trim().length > 0);
}

export function formatServiceItem(i: ServiceItem) {
  const amount = [i.qty, i.unit].filter((p) => p && p.trim()).join(" ");
  return amount ? `${i.title} — ${amount}` : i.title;
}

export function ServiceItemsEditor({
  items,
  onChange,
}: {
  items: ServiceItem[];
  onChange: (items: ServiceItem[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("adet");

  function add() {
    if (!title.trim()) return;
    onChange([...items, { title: title.trim().toLocaleUpperCase("tr"), qty: qty.trim(), unit }]);
    setTitle("");
    setQty("1");
    setUnit("adet");
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-background">
        {items.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            Henüz madde eklenmedi. Değişen parçaları ve yapılan işlemleri tek tek ekleyin.
          </p>
        )}
        <ul className="divide-y">
          {items.map((it, idx) => (
            <li key={`${it.title}-${idx}`} className="flex items-center gap-2 px-3 py-2">
              <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">
                {idx + 1}.
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold">{it.title}</span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                {[it.qty, it.unit].filter(Boolean).join(" ")}
              </span>
              <button
                type="button"
                aria-label={`${it.title} maddesini sil`}
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-[1fr_4.5rem_6rem] gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="item-title" className="text-xs">
            İşlem / Parça
          </Label>
          <Input
            id="item-title"
            value={title}
            maxLength={120}
            placeholder="Korna butonu"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item-qty" className="text-xs">
            Miktar
          </Label>
          <Input
            id="item-qty"
            value={qty}
            inputMode="decimal"
            maxLength={8}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item-unit" className="text-xs">
            Birim
          </Label>
          <select
            id="item-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button type="button" variant="secondary" className="w-full" onClick={add}>
        <Plus className="mr-1 size-4" /> Maddeyi Ekle
      </Button>
    </div>
  );
}
