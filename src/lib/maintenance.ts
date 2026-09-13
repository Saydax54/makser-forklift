export type MaintenanceMachine = {
  hour_meter: number | null;
  last_service_at: string | null;
  last_service_hours: number | null;
  service_interval_hours: number | null;
  service_interval_months: number | null;
};

export type MaintenanceState = {
  hourMeter: number;
  intervalHours: number;
  intervalMonths: number;
  /** Kalan çalışma saati (negatif ise geçmiş). */
  hoursLeft: number;
  nextHours: number;
  nextDate: Date | null;
  daysLeft: number | null;
  overdue: boolean;
  soon: boolean;
  label: string;
  toneClass: string;
};

const SOON_HOURS = 25;
const SOON_DAYS = 15;

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function maintenanceState(m: MaintenanceMachine): MaintenanceState {
  const hourMeter = Number(m.hour_meter ?? 0);
  const intervalHours = Number(m.service_interval_hours ?? 250) || 250;
  const intervalMonths = Number(m.service_interval_months ?? 3) || 3;
  const baseHours = Number(m.last_service_hours ?? 0);
  const nextHours = baseHours + intervalHours;
  const hoursLeft = nextHours - hourMeter;

  const nextDate = m.last_service_at ? addMonths(new Date(m.last_service_at), intervalMonths) : null;
  const daysLeft = nextDate
    ? Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const overdue = hoursLeft <= 0 || (daysLeft !== null && daysLeft <= 0);
  const soon = !overdue && (hoursLeft <= SOON_HOURS || (daysLeft !== null && daysLeft <= SOON_DAYS));

  let label: string;
  if (!m.last_service_at && !m.last_service_hours) {
    label = "Bakım kaydı yok";
  } else if (overdue) {
    label = "Bakım zamanı geldi";
  } else if (soon) {
    label = "Bakım yaklaşıyor";
  } else {
    label = "Bakım güncel";
  }

  const toneClass = overdue
    ? "bg-destructive/15 text-destructive border-destructive/30"
    : soon
      ? "bg-warning/20 text-warning-foreground border-warning/40"
      : "bg-success/15 text-success-foreground border-success/30";

  return {
    hourMeter,
    intervalHours,
    intervalMonths,
    hoursLeft,
    nextHours,
    nextDate,
    daysLeft,
    overdue,
    soon,
    label,
    toneClass,
  };
}

export function maintenanceSummary(m: MaintenanceMachine) {
  const s = maintenanceState(m);
  const parts: string[] = [];
  parts.push(`Sayaç: ${formatHours(s.hourMeter)} sa`);
  parts.push(
    s.hoursLeft > 0
      ? `${formatHours(s.hoursLeft)} sa kaldı (${formatHours(s.nextHours)} sa)`
      : `${formatHours(Math.abs(s.hoursLeft))} sa geçti`,
  );
  if (s.nextDate) {
    parts.push(
      `Tarih: ${s.nextDate.toLocaleDateString("tr-TR")}${
        s.daysLeft !== null && s.daysLeft > 0 ? ` (${s.daysLeft} gün)` : " (geçti)"
      }`,
    );
  }
  return parts.join(" · ");
}

export function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
