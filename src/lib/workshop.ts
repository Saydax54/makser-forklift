import { useSyncExternalStore } from "react";

export type WorkshopSettings = {
  name: string;
  tagline: string;
  phone: string;
  phoneIntl: string;
  address: string;
  email: string;
  website: string;
  taxOffice: string;
  taxNo: string;
  logoUrl: string;
  accentColor: string;
  formTitle: string;
  pricedFormTitle: string;
  declaration: string;
  footerNote: string;
  whatsappTemplate: string;
  soonHours: number;
  soonDays: number;
};

export const DEFAULT_WORKSHOP: WorkshopSettings = {
  name: "MAKSER FORKLİFT",
  tagline: "Forklift Teknik Servis & Saha Bakım",
  phone: "0530 626 99 53",
  phoneIntl: "905306269953",
  address: "Çerkezkent Ticaret Merkezi",
  email: "",
  website: "",
  taxOffice: "",
  taxNo: "",
  logoUrl: "",
  accentColor: "#f0a13c",
  formTitle: "TEKNİK SERVİS FORMU",
  pricedFormTitle: "SERVİS FORMU (FİYATLI)",
  declaration:
    "Yukarıda belirtilen işlemlerin tarafımıza eksiksiz yapıldığını ve cihazın çalışır durumda teslim alındığını beyan ederim.",
  footerNote: "Bizi tercih ettiğiniz için teşekkür ederiz.",
  whatsappTemplate:
    "Merhaba {musteri}, {atolye} servis ekibi olarak yaptığımız işlemler tamamlanmıştır. Servis formunuz ektedir. {telefon}",
  soonHours: 25,
  soonDays: 15,
};

/** Mutable live settings; updated from the database at startup and after saves. */
export const WORKSHOP: WorkshopSettings = { ...DEFAULT_WORKSHOP };

let version = 0;
const listeners = new Set<() => void>();

export function applyWorkshopSettings(data: Partial<WorkshopSettings> | null | undefined) {
  Object.assign(WORKSHOP, DEFAULT_WORKSHOP, data ?? {});
  WORKSHOP.soonHours = Number(WORKSHOP.soonHours) || DEFAULT_WORKSHOP.soonHours;
  WORKSHOP.soonDays = Number(WORKSHOP.soonDays) || DEFAULT_WORKSHOP.soonDays;
  const digits = WORKSHOP.phone.replace(/\D/g, "");
  WORKSHOP.phoneIntl = digits.startsWith("90") ? digits : digits.replace(/^0/, "90");
  version++;
  listeners.forEach((l) => l());
}

export function useWorkshop(): WorkshopSettings {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => 0,
  );
  return WORKSHOP;
}

export function whatsappMessage(customer: string) {
  return WORKSHOP.whatsappTemplate
    .replaceAll("{musteri}", customer)
    .replaceAll("{atolye}", WORKSHOP.name)
    .replaceAll("{telefon}", WORKSHOP.phone);
}

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
