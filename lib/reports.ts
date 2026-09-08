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

/**
 * Groeperingsniveau voor de "per dag"-rapportages (§ n.a.v. "ook per week/
 * maand/kwartaal"-verzoek, sep 2026) -- los van ReportPeriod, dat bepaalt
 * hoe ver terug in de tijd; dit bepaalt hoe de punten binnen die periode
 * gebundeld worden.
 */
export type Granularity = "DAY" | "WEEK" | "MONTH" | "QUARTER";

export const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "DAY", label: "Per dag" },
  { value: "WEEK", label: "Per week" },
  { value: "MONTH", label: "Per maand" },
  { value: "QUARTER", label: "Per kwartaal" },
];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = zondag
  const diff = (day === 0 ? -6 : 1) - day; // naar de maandag van deze week
  d.setDate(d.getDate() + diff);
  return d;
}

/** Sleutel voor de bucket waar `date` in valt -- chronologisch sorteerbaar
 * als platte string voor elk granulariteitsniveau. */
export function bucketKey(date: Date, granularity: Granularity): string {
  switch (granularity) {
    case "DAY":
      return date.toISOString().slice(0, 10);
    case "WEEK":
      return startOfWeek(date).toISOString().slice(0, 10);
    case "MONTH":
      return date.toISOString().slice(0, 7);
    case "QUARTER": {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `${date.getFullYear()}-Q${q}`;
    }
  }
}

/** Leesbaar label voor een bucket-sleutel, voor op de X-as/in lijsten. */
export function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "WEEK") {
    const d = new Date(key);
    return `Week van ${d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`;
  }
  return key;
}

/** Alle bucket-sleutels tussen `start` (incl.) en `end` (excl.), aaneen-
 * gesloten en zonder gaten -- nodig zodat de trend/forecast-berekening
 * (lib/trend.ts) tegen gelijk verdeelde tijdstappen rekent i.p.v. alleen
 * tegen buckets mét registraties. */
export function bucketRangeKeys(start: Date, end: Date, granularity: Granularity): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const cursor = new Date(start);
  while (cursor < end) {
    const key = bucketKey(cursor, granularity);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

/**
 * Beperkt het te tonen bereik tot waar daadwerkelijk registraties zijn --
 * anders toont een brede periode (bv. "Dit jaar" met pas sinds juni data)
 * maandenlang lege nulwaarden, en start de forecast pas na het einde van
 * de hele periode i.p.v. vlak na de laatste echte registratie. Geeft
 * `null` terug als er helemaal geen data is (dan toont de rapportage zijn
 * eigen "geen data"-melding, geen lege reeks).
 */
export function trimToDataRange(dates: Date[], periodStart: Date, periodEnd: Date): { start: Date; end: Date } | null {
  if (dates.length === 0) return null;
  const times = dates.map((d) => d.getTime());
  const earliest = new Date(Math.min(...times));
  const latest = new Date(Math.max(...times));
  latest.setDate(latest.getDate() + 1); // exclusief eind, net als periodEnd
  return {
    start: earliest < periodStart ? periodStart : earliest,
    end: latest > periodEnd ? periodEnd : latest,
  };
}

/** Genereert `count` toekomstige bucket-sleutels na `lastKey`, voor de
 * forecast-reeks (zelfde granulariteit als de historische data). */
export function nextBucketKeys(lastKey: string, count: number, granularity: Granularity): string[] {
  switch (granularity) {
    case "DAY": {
      const last = new Date(lastKey);
      return Array.from({ length: count }, (_, i) => {
        const d = new Date(last);
        d.setDate(d.getDate() + i + 1);
        return d.toISOString().slice(0, 10);
      });
    }
    case "WEEK": {
      const last = new Date(lastKey);
      return Array.from({ length: count }, (_, i) => {
        const d = new Date(last);
        d.setDate(d.getDate() + (i + 1) * 7);
        return d.toISOString().slice(0, 10);
      });
    }
    case "MONTH": {
      const [year, month] = lastKey.split("-").map(Number);
      return Array.from({ length: count }, (_, i) => {
        const d = new Date(year, month - 1 + i + 1, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      });
    }
    case "QUARTER": {
      const [yearStr, qStr] = lastKey.split("-Q");
      let year = Number(yearStr);
      let quarter = Number(qStr);
      return Array.from({ length: count }, () => {
        quarter++;
        if (quarter > 4) {
          quarter = 1;
          year++;
        }
        return `${year}-Q${quarter}`;
      });
    }
  }
}
