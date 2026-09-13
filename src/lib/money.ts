import type { ServiceItem } from "@/components/ServiceItemsEditor";

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatTry(value: number) {
  return value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  });
}

export function itemTotal(item: ServiceItem) {
  const qty = toNumber(item.qty) || 0;
  const price = toNumber(item.price);
  if (!price) return 0;
  return (qty || 1) * price;
}

export function itemsTotal(items: ServiceItem[]) {
  return items.reduce((sum, i) => sum + itemTotal(i), 0);
}

export function hasPrices(items: ServiceItem[]) {
  return items.some((i) => toNumber(i.price) > 0);
}
