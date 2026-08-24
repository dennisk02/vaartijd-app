// Pure aggregatiefuncties voor het financiële Rentman-dashboard (§10.5).
// Werken allemaal op de ruwe RentmanSubprojectSnapshot-rijen (zie
// dashboardSync.ts) -- bij ~800 rijen is dit in-memory triviaal snel, dus
// geen enkele van deze doorsnedes wordt vooraf apart opgeslagen.

export type Subproject = {
  id: string;
  name: string;
  projectNumber: string | null;
  status: string;
  revenue: number;
  cancelledRevenue: number | null;
  invoiced: number;
  month: string;
  createdAt: Date;
  planperiodStart: Date | null;
  planperiodEnd: Date | null;
};

const CANCELLED = "Geannuleerd";
const PENDING_STATUSES = ["Optie", "Aanvraag"];

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

function sortedMonths(subs: Subproject[]) {
  return [...new Set(subs.map((s) => s.month))].sort();
}

// --- Tab 1: Omzet & Facturatie ------------------------------------------

export function overviewKpis(subs: Subproject[]) {
  const totalProjects = subs.length;
  const totalRevenue = sum(subs.map((s) => s.revenue));
  const totalInvoiced = sum(subs.map((s) => s.invoiced));
  const invoicedPct = totalRevenue > 0 ? Math.round((totalInvoiced / totalRevenue) * 100) : 0;
  const optieRevenue = sum(subs.filter((s) => s.status === "Optie").map((s) => s.revenue));
  const cancelled = subs.filter((s) => s.status === CANCELLED);
  const cancelledRevenue = sum(cancelled.map((s) => s.cancelledRevenue ?? 0));
  return { totalProjects, totalRevenue, totalInvoiced, invoicedPct, optieRevenue, cancelledRevenue, cancelledCount: cancelled.length };
}

export function monthlySeries(subs: Subproject[]) {
  return sortedMonths(subs).map((month) => {
    const inMonth = subs.filter((s) => s.month === month);
    const omzet = sum(inMonth.map((s) => s.revenue));
    const gefact = sum(inMonth.map((s) => s.invoiced));
    return { month, omzet, gefact, pct: omzet > 0 ? Math.round((gefact / omzet) * 100) : 0 };
  });
}

/** Gestapelde omzet per status per maand -- geannuleerd telt niet mee (revenue is daar altijd 0). */
export function statusByMonth(subs: Subproject[]) {
  const months = sortedMonths(subs);
  const active = subs.filter((s) => s.status !== CANCELLED);
  const statuses = [...new Set(active.map((s) => s.status))];
  // Vaste, herkenbare volgorde waar mogelijk, onbekende statussen achteraan.
  const order = ["Aanvraag", "Optie", "Bevestigd", "Klaargezet", "Op locatie", "Schoonmaken & nakijken", "Retour ophalen", "Retour", "Concept"];
  statuses.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const series = statuses.map((status) => ({
    status,
    data: months.map((month) => sum(active.filter((s) => s.month === month && s.status === status).map((s) => s.revenue))),
  }));
  return { months, series };
}

/** Open (niet-gefactureerde) omzet per status, over alle maanden heen. */
export function openByStatus(subs: Subproject[]) {
  const active = subs.filter((s) => s.status !== CANCELLED);
  const statuses = [...new Set(active.map((s) => s.status))];
  return statuses
    .map((status) => ({
      status,
      value: sum(active.filter((s) => s.status === status).map((s) => Math.max(0, s.revenue - s.invoiced))),
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

// --- Tab 2: Projecten per maand -----------------------------------------

export type ProjectRow = {
  id: string;
  number: string | null;
  name: string;
  period: Date | null;
  revenue: number;
  invoiced: number;
};

export function monthDetail(subs: Subproject[], month: string) {
  const inMonth = subs.filter((s) => s.month === month);
  const totalRevenue = sum(inMonth.map((s) => s.revenue));
  const totalInvoiced = sum(inMonth.map((s) => s.invoiced));

  const statusNames = [...new Set(inMonth.map((s) => s.status))];
  const statusGroups = statusNames
    .map((status) => {
      const rows = inMonth
        .filter((s) => s.status === status)
        .map((s): ProjectRow => ({ id: s.id, number: s.projectNumber, name: s.name, period: s.planperiodStart, revenue: s.revenue, invoiced: s.invoiced }))
        .sort((a, b) => b.revenue - a.revenue);
      const revenue = sum(rows.map((r) => r.revenue));
      const invoiced = sum(rows.map((r) => r.invoiced));
      return { status, count: rows.length, revenue, invoiced, rows };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const donut = statusGroups.filter((g) => g.revenue > 0 && g.status !== CANCELLED).map((g) => ({ status: g.status, value: g.revenue }));

  return {
    month,
    totalRevenue,
    totalInvoiced,
    invoicedPct: totalRevenue > 0 ? Math.round((totalInvoiced / totalRevenue) * 100) : 0,
    statusGroups,
    donut,
  };
}

// --- Tab 3: Geannuleerd ---------------------------------------------------

export function cancelledKpis(subs: Subproject[]) {
  const cancelled = subs.filter((s) => s.status === CANCELLED);
  const withAmount = cancelled.filter((s) => (s.cancelledRevenue ?? 0) > 0);
  const totalRevenue = sum(cancelled.map((s) => s.cancelledRevenue ?? 0));
  let largest: Subproject | null = null;
  for (const s of cancelled) {
    if ((s.cancelledRevenue ?? 0) > (largest?.cancelledRevenue ?? 0)) largest = s;
  }
  return {
    count: cancelled.length,
    totalRevenue,
    largest,
    countWithAmount: withAmount.length,
    avgPerCancellation: withAmount.length > 0 ? totalRevenue / withAmount.length : 0,
  };
}

export function cancelledByMonth(subs: Subproject[]) {
  return sortedMonths(subs).map((month) => {
    const cancelled = subs.filter((s) => s.month === month && s.status === CANCELLED);
    return { month, revenue: sum(cancelled.map((s) => s.cancelledRevenue ?? 0)), count: cancelled.length };
  });
}

export function cancelledInMonth(subs: Subproject[], month: string) {
  return subs
    .filter((s) => s.month === month && s.status === CANCELLED)
    .map((s): ProjectRow => ({ id: s.id, number: s.projectNumber, name: s.name, period: s.planperiodStart, revenue: s.cancelledRevenue ?? 0, invoiced: 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

// --- Tab 6: In optie & aanvraag -------------------------------------------

export function pendingKpis(subs: Subproject[]) {
  const optie = subs.filter((s) => s.status === "Optie");
  const aanvraag = subs.filter((s) => s.status === "Aanvraag");
  const all = [...optie, ...aanvraag];
  let oldest: Subproject | null = null;
  for (const s of all) {
    if (!oldest || s.createdAt < oldest.createdAt) oldest = s;
  }
  return {
    optieCount: optie.length,
    optieRevenue: sum(optie.map((s) => s.revenue)),
    aanvraagCount: aanvraag.length,
    aanvraagRevenue: sum(aanvraag.map((s) => s.revenue)),
    totalRevenue: sum(all.map((s) => s.revenue)),
    oldest,
  };
}

export function pendingList(subs: Subproject[]) {
  const now = new Date();
  return subs
    .filter((s) => PENDING_STATUSES.includes(s.status))
    .map((s) => ({ ...s, expired: !!s.planperiodEnd && s.planperiodEnd < now }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

// --- Tab 5: Opvolging (best-effort, zie HANDOVER §10.5) --------------------
//
// De exacte regels achter "Aandacht"/"Toekomstig"/"Doorlopend" in het
// referentiedashboard zijn niet uit de data zelf af te leiden (dat was een
// eenmalige, handmatig gecureerde analyse) -- onderstaande classificatie is
// een redelijke, transparante benadering: periode al voorbij + nog niet
// (volledig) gefactureerd = Aandacht; periode nog in de toekomst =
// Toekomstig. "Doorlopend" (contracten) en de creditnota-filter uit het
// origineel zijn NIET automatisch te detecteren zonder extra Rentman-
// velden/config en zijn hier bewust weggelaten i.p.v. gefabriceerd.

export type FollowUpFlag = "aandacht" | "toekomstig" | null;

export function followUpList(subs: Subproject[]) {
  const now = new Date();
  return subs
    .filter((s) => s.status !== CANCELLED && !PENDING_STATUSES.includes(s.status) && s.revenue - s.invoiced > 0.01)
    .map((s) => {
      let flag: FollowUpFlag = null;
      if (s.planperiodEnd && s.planperiodEnd < now) flag = "aandacht";
      else if (s.planperiodStart && s.planperiodStart > now) flag = "toekomstig";
      return { ...s, open: s.revenue - s.invoiced, flag };
    })
    .sort((a, b) => a.month.localeCompare(b.month) || b.open - a.open);
}

export function followUpKpis(subs: Subproject[]) {
  const list = followUpList(subs);
  const aandacht = list.filter((s) => s.flag === "aandacht");
  return { directCount: aandacht.length, directRevenue: sum(aandacht.map((s) => s.open)) };
}
