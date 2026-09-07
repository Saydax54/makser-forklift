export const WORKSHOP = {
  name: "MAKSER FORKLİFT",
  phone: "0530 626 99 53",
  phoneIntl: "905306269953",
  address: "Çerkezkent Ticaret Merkezi",
  tagline: "Forklift Teknik Servis & Saha Bakım",
};

export type WorkOrderStatus = "pending" | "in_progress" | "completed";

export const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  pending: "Bekliyor",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
};

export const STATUS_ORDER: WorkOrderStatus[] = ["pending", "in_progress", "completed"];

export function statusBadgeClass(status: string) {
  if (status === "completed") return "bg-success/15 text-success-foreground border-success/30";
  if (status === "in_progress") return "bg-warning/20 text-warning-foreground border-warning/40";
  return "bg-muted text-muted-foreground border-border";
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
