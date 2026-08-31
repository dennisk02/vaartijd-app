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
  city: string | null;
  businessUnit: string;
  category: string;
};

const CANCELLED = "Geannuleerd";

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
  // "In optie" en "Direct opvolgen" komen ook als eigen KPI-kaart op de
  // Overzicht-tab (referentiedashboard v6.1) -- hergebruik dezelfde telling
  // als de eigen tabbladen ("In optie & aanvraag" resp. "Opvolging").
  const inOptieCount = subs.filter((s) => s.status === "Optie").length;
  const directOpvolgenCount = followUpKpis(subs).aandachtCount;
  return {
    totalProjects,
    totalRevenue,
    totalInvoiced,
    invoicedPct,
    optieRevenue,
    cancelledRevenue,
    cancelledCount: cancelled.length,
    inOptieCount,
    directOpvolgenCount,
  };
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

// --- Tab 1 (vervolg): BV & Categorie -------------------------------------
//
// businessUnit/category worden al berekend en opgeslagen door
// dashboardSync.ts (zie daar voor de exacte afleidingsregels); hier alleen
// nog aggregatie. Geannuleerde subprojecten (revenue altijd 0) tellen wel
// mee in de projecttelling maar dragen niets bij aan de omzetcijfers.

export const BV_ORDER = ["EVENTO", "M&R Kampen", "M&R Utrecht"];

export function bvStats(subs: Subproject[]) {
  const stats: Record<string, { aantal: number; omzet: number; gefact: number }> = {};
  for (const bv of BV_ORDER) stats[bv] = { aantal: 0, omzet: 0, gefact: 0 };
  for (const s of subs) {
    const bv = stats[s.businessUnit] ? s.businessUnit : "M&R Kampen";
    stats[bv].aantal += 1;
    stats[bv].omzet += s.revenue;
    stats[bv].gefact += s.invoiced;
  }
  return stats;
}

export function omzetBvMaand(subs: Subproject[]) {
  const months = sortedMonths(subs);
  const result: Record<string, number[]> = {};
  for (const bv of BV_ORDER) {
    result[bv] = months.map((month) => sum(subs.filter((s) => s.month === month && s.businessUnit === bv).map((s) => s.revenue)));
  }
  return { months, series: result };
}

export function omzetPerCategorie(subs: Subproject[]) {
  const result: Record<string, { aantal: number; omzet: number }> = {};
  for (const s of subs) {
    const cat = s.category || "Overig";
    if (!result[cat]) result[cat] = { aantal: 0, omzet: 0 };
    result[cat].aantal += 1;
    result[cat].omzet += s.revenue;
  }
  return result;
}

/** Gegroepeerde categorieën voor de gestapelde maandgrafiek: BBQ en Foodtruck
 * (kleine, seizoensgebonden categorieën) vallen samen met alle overige
 * niet-Verhuur/Catering-categorieën onder "Overig", zodat de grafiek
 * leesbaar blijft -- de volledige uitsplitsing staat in de tabel ernaast. */
export function catGroupMaand(subs: Subproject[]) {
  const months = sortedMonths(subs);
  function groupOf(category: string): "Verhuur" | "Catering" | "Overig" {
    if (category === "Verhuur") return "Verhuur";
    if (category === "Catering") return "Catering";
    return "Overig";
  }
  const groups = ["Verhuur", "Catering", "Overig"] as const;
  const result: Record<string, number[]> = {};
  for (const g of groups) {
    result[g] = months.map((month) => sum(subs.filter((s) => s.month === month && groupOf(s.category) === g).map((s) => s.revenue)));
  }
  return { months, series: result };
}

// --- Tab 2: Projecten per maand -----------------------------------------

export type ProjectRow = {
  id: string;
  number: string | null;
  name: string;
  city: string | null;
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
        .map((s): ProjectRow => ({ id: s.id, number: s.projectNumber, name: s.name, city: s.city, period: s.planperiodStart, revenue: s.revenue, invoiced: s.invoiced }))
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
    .map((s): ProjectRow => ({ id: s.id, number: s.projectNumber, name: s.name, city: s.city, period: s.planperiodStart, revenue: s.cancelledRevenue ?? 0, invoiced: 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

// --- Tab 4: In optie & aanvraag -------------------------------------------
//
// Gegroepeerd per aanmaakmaand (net als de andere tabbladen), gesplitst in
// twee kolommen (Optie/Aanvraag) -- rechtstreeks overgenomen uit het
// referentiedashboard (v6.1, `buildColumn`).

export type PendingRow = {
  id: string;
  number: string | null;
  name: string;
  city: string | null;
  businessUnit: string;
  revenue: number;
  period: Date | null;
  expired: boolean;
};

function toPendingRow(s: Subproject, now: Date): PendingRow {
  return {
    id: s.id,
    number: s.projectNumber,
    name: s.name,
    city: s.city,
    businessUnit: s.businessUnit,
    revenue: s.revenue,
    period: s.planperiodStart,
    expired: !!s.planperiodEnd && s.planperiodEnd < now,
  };
}

export function pendingKpis(subs: Subproject[]) {
  const optie = subs.filter((s) => s.status === "Optie");
  const aanvraag = subs.filter((s) => s.status === "Aanvraag");
  return { optieCount: optie.length, aanvraagCount: aanvraag.length };
}

/** Optie/aanvraag-projecten per aanmaakmaand, elk gesorteerd oudste eerst. */
export function pendingByMonth(subs: Subproject[]) {
  const now = new Date();
  const months = sortedMonths(subs);
  function column(status: string) {
    const result: Record<string, PendingRow[]> = {};
    for (const month of months) {
      result[month] = subs
        .filter((s) => s.month === month && s.status === status)
        .map((s) => toPendingRow(s, now))
        .sort((a, b) => (a.period?.getTime() ?? 0) - (b.period?.getTime() ?? 0));
    }
    return result;
  }
  return { months, optie: column("Optie"), aanvraag: column("Aanvraag") };
}

// --- Tab 3: Opvolging -----------------------------------------------------
//
// Regels 1-op-1 overgenomen uit het referentiedashboard (v6.1), teruggevonden
// via de meegeleverde note-tekst op dat dashboard:
// - Filter (ongeacht status): omzet > 0, omzet - gefactureerd > 1,
//   gefactureerd >= -0,01. Geannuleerde subprojecten (omzet altijd 0) vallen
//   hier vanzelf al buiten, dus een aparte statusuitsluiting is niet nodig.
// - Doorlopend (🔵): naam bevat "wekelijkse" (ongeacht hoofd-/kleine letters)
//   -- wordt vóór de andere twee regels getoetst.
// - Direct opvolgen (🔴): periode (planperiod_end) is verstreken.
// - Toekomstig (🟡): periode nog niet verstreken, of onbekend.

export type FollowUpFlag = "aandacht" | "toekomstig" | "doorlopend";

export type FollowUpRow = {
  id: string;
  number: string | null;
  name: string;
  city: string | null;
  open: number;
  period: Date | null;
  expired: boolean;
  flag: FollowUpFlag;
};

function followUpFlagOf(s: Subproject, now: Date): FollowUpFlag {
  if (s.name.toLowerCase().includes("wekelijkse")) return "doorlopend";
  if (s.planperiodEnd && s.planperiodEnd < now) return "aandacht";
  return "toekomstig";
}

function followUpFiltered(subs: Subproject[]) {
  return subs.filter((s) => s.revenue > 0 && s.revenue - s.invoiced > 1 && s.invoiced >= -0.01);
}

export function followUpKpis(subs: Subproject[]) {
  const now = new Date();
  const list = followUpFiltered(subs).map((s) => followUpFlagOf(s, now));
  return {
    aandachtCount: list.filter((f) => f === "aandacht").length,
    toekomstigCount: list.filter((f) => f === "toekomstig").length,
    doorlopendCount: list.filter((f) => f === "doorlopend").length,
  };
}

/** Opvolgingsprojecten per aanmaakmaand, uitgesplitst in de 3 secties,
 * elk gesorteerd op hoogste openstaand bedrag (net als het referentiedashboard). */
export function followUpByMonth(subs: Subproject[]) {
  const now = new Date();
  const months = sortedMonths(subs);
  const filtered = followUpFiltered(subs);
  const result: Record<string, { aandacht: FollowUpRow[]; toekomstig: FollowUpRow[]; doorlopend: FollowUpRow[] }> = {};
  for (const month of months) {
    const inMonth = filtered.filter((s) => s.month === month);
    const rows: FollowUpRow[] = inMonth.map((s) => {
      const flag = followUpFlagOf(s, now);
      return {
        id: s.id,
        number: s.projectNumber,
        name: s.name,
        city: s.city,
        open: s.revenue - s.invoiced,
        period: s.planperiodStart,
        expired: !!s.planperiodEnd && s.planperiodEnd < now,
        flag,
      };
    });
    const byOpenDesc = (a: FollowUpRow, b: FollowUpRow) => b.open - a.open;
    result[month] = {
      aandacht: rows.filter((r) => r.flag === "aandacht").sort(byOpenDesc),
      toekomstig: rows.filter((r) => r.flag === "toekomstig").sort(byOpenDesc),
      doorlopend: rows.filter((r) => r.flag === "doorlopend").sort(byOpenDesc),
    };
  }
  return { months, data: result };
}
