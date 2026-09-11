import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ListPlus } from "lucide-react";
import { FUEL_LABEL, fetchServiceTemplates } from "@/lib/service-templates";
import type { ServiceItem } from "@/components/ServiceItemsEditor";

export function ServiceTemplatePicker({ onApply }: { onApply: (items: ServiceItem[]) => void }) {
  const [templateId, setTemplateId] = useState("");
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const templates = useQuery({ queryKey: ["service-templates"], queryFn: fetchServiceTemplates });
  const list = templates.data ?? [];
  const selected = useMemo(() => list.find((t) => t.id === templateId), [list, templateId]);

  function pick(id: string) {
    setTemplateId(id);
    const t = list.find((x) => x.id === id);
    setChecked(Object.fromEntries((t?.items ?? []).map((_, i) => [i, true])));
  }

  function apply() {
    if (!selected) return;
    const items = selected.items.filter((_, i) => checked[i]);
    if (!items.length) return;
    onApply(items);
  }

  if (list.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <Label htmlFor="tpl" className="text-xs">
        Hazır Bakım Şablonu
      </Label>
      <select
        id="tpl"
        value={templateId}
        onChange={(e) => pick(e.target.value)}
        className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">Şablon seçin…</option>
        {list.map((t) => (
          <option key={t.id} value={t.id}>
            {FUEL_LABEL[t.fuel_type]} · {t.name}
          </option>
        ))}
      </select>

      {selected && (
        <>
          <ul className="mt-3 space-y-1.5">
            {selected.items.map((it, i) => (
              <li key={`${it.title}-${i}`}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={!!checked[i]}
                    onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })}
                  />
                  <span className="min-w-0 flex-1 font-semibold">{it.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {[it.qty, it.unit].filter(Boolean).join(" ")}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button type="button" className="flex-1" onClick={apply}>
              <ListPlus className="mr-1 size-4" /> Seçilenleri Listeye Ekle
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setChecked(
                  Object.fromEntries(
                    selected.items.map((_, i) => [i, !selected.items.every((__, j) => checked[j])]),
                  ),
                )
              }
            >
              Tümü
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Eklenen maddeler elle girilmiş gibi listelenir; miktarını değiştirebilir veya
            silebilirsiniz.
          </p>
        </>
      )}
    </div>
  );
}
