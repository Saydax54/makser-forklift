import { supabase } from "@/integrations/supabase/client";
import { parseServiceItems, type ServiceItem } from "@/components/ServiceItemsEditor";

export type FuelType = "diesel" | "electric" | "all";

export const FUEL_LABEL: Record<FuelType, string> = {
  diesel: "Dizel",
  electric: "Elektrikli",
  all: "Tümü",
};

export type ServiceTemplate = {
  id: string;
  name: string;
  fuel_type: FuelType;
  description: string;
  items: ServiceItem[];
};

export async function fetchServiceTemplates(): Promise<ServiceTemplate[]> {
  const { data, error } = await supabase
    .from("service_templates")
    .select("id, name, fuel_type, description, items")
    .order("fuel_type", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    fuel_type: (["diesel", "electric", "all"].includes(t.fuel_type)
      ? t.fuel_type
      : "all") as FuelType,
    description: t.description ?? "",
    items: parseServiceItems(t.items),
  }));
}

export function mergeServiceItems(current: ServiceItem[], incoming: ServiceItem[]): ServiceItem[] {
  const seen = new Set(current.map((i) => i.title.trim().toLocaleUpperCase("tr")));
  const added = incoming.filter((i) => {
    const key = i.title.trim().toLocaleUpperCase("tr");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...current, ...added];
}
