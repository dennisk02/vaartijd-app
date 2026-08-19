export type ReportPeriod = "LAST_30_DAYS" | "LAST_MONTH" | "THIS_YEAR" | "LAST_YEAR";

export const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "LAST_30_DAYS", label: "Afgelopen 30 dagen" },
  { value: "LAST_MONTH", label: "Afgelopen maand" },
  { value: "THIS_YEAR", label: "Dit jaar" },
  { value: "LAST_YEAR", label: "Vorig jaar" },
];

/** Geeft een [start, end) datumbereik terug -- end is exclusief. */
export function getPeriodRange(period: ReportPeriod): { start: Date; end: Date } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "LAST_30_DAYS": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 29);
      const end = new Date(startOfToday);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    case "LAST_MONTH": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
    case "THIS_YEAR": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      return { start, end };
    }
    case "LAST_YEAR": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear(), 0, 1);
      return { start, end };
    }
  }
}
