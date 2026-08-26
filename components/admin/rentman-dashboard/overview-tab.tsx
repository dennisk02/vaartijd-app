"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { dash, statusColor } from "./colors";
import { KpiCard, KpiGrid, Callout, ChartCard } from "./kpi-card";
import { formatEuro, formatMonthLabel } from "./format";
import type { Subproject } from "@/lib/rentman/dashboardAggregate";
import {
  BV_ORDER,
  bvStats,
  catGroupMaand,
  monthlySeries,
  omzetBvMaand,
  omzetPerCategorie,
  openByStatus,
  overviewKpis,
  statusByMonth,
} from "@/lib/rentman/dashboardAggregate";

const BV_COLORS: Record<string, string> = { EVENTO: dash.blue, "M&R Kampen": dash.green, "M&R Utrecht": dash.orange };
const CAT_GROUP_COLORS: Record<string, string> = { Verhuur: dash.blue, Catering: dash.green, Overig: dash.mutedLight };

export function OverviewTab({
  subs,
  invoicedMonthly,
}: {
  subs: Subproject[];
  invoicedMonthly: { month: string; invoicedExclVat: number }[];
}) {
  const kpi = overviewKpis(subs);
  const months = monthlySeries(subs);
  const stacked = statusByMonth(subs);
  const open = openByStatus(subs);
  const bv = bvStats(subs);
  const bvMaand = omzetBvMaand(subs);
  const categorie = omzetPerCategorie(subs);
  const catMaand = catGroupMaand(subs);

  const revenueChartData = months.map((m) => ({ month: formatMonthLabel(m.month), Projectomzet: m.omzet, Gefactureerd: m.gefact }));
  const rateChartData = months.map((m) => ({ month: formatMonthLabel(m.month), pct: m.pct }));
  const stackedChartData = stacked.months.map((month, i) => {
    const row: Record<string, string | number> = { month: formatMonthLabel(month) };
    for (const s of stacked.series) row[s.status] = s.data[i];
    return row;
  });
  const totaalGefactFactuurdatum = invoicedMonthly.reduce((sum, r) => sum + r.invoicedExclVat, 0);
  const factuurdatumChartData = invoicedMonthly.map((r) => ({ month: formatMonthLabel(r.month), "Gefactureerd (factuurdatum)": Math.round(r.invoicedExclVat) }));
  const bvChartData = bvMaand.months.map((month, i) => {
    const row: Record<string, string | number> = { month: formatMonthLabel(month) };
    for (const name of BV_ORDER) row[name] = bvMaand.series[name][i];
    return row;
  });
  const catChartData = catMaand.months.map((month, i) => {
    const row: Record<string, string | number> = { month: formatMonthLabel(month) };
    for (const g of ["Verhuur", "Catering", "Overig"]) row[g] = catMaand.series[g][i];
    return row;
  });
  const categorieRows = Object.entries(categorie).sort((a, b) => b[1].omzet - a[1].omzet);

  return (
    <div className="flex flex-col gap-3.5">
      <KpiGrid>
        <KpiCard label="Projecten" value={String(kpi.totalProjects)} sub={`${months.length} maanden`} />
        <KpiCard label="Projectomzet" value={formatEuro(kpi.totalRevenue)} sub="Excl. BTW" />
        <KpiCard
          label="Gefactureerd %"
          value={`${kpi.invoicedPct}%`}
          valueColor={kpi.invoicedPct < 50 ? dash.red : kpi.invoicedPct < 70 ? dash.orange : dash.green}
        />
        <KpiCard label="In optie" value={String(kpi.inOptieCount)} valueColor={dash.blue} />
        <KpiCard label="Direct opvolgen" value={String(kpi.directOpvolgenCount)} valueColor={dash.red} />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[2fr_1fr]">
        <ChartCard title="Projectomzet vs. gefactureerd" sub="Per aanmaakmaand · Excl. BTW">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueChartData}>
              <CartesianGrid vertical={false} stroke={dash.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={{ stroke: dash.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `€${Math.round(v / 1000)}K`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
                cursor={{ fill: dash.panel2 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: dash.mutedLight }} />
              <Bar dataKey="Projectomzet" fill="rgba(91,141,239,0.18)" stroke={dash.blue} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="Gefactureerd" fill="rgba(62,207,142,0.18)" stroke={dash.green} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Facturatiegraad" sub="% gefactureerd per maand">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rateChartData}>
              <CartesianGrid vertical={false} stroke={dash.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={{ stroke: dash.border }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={false} tickLine={false} width={34} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => `${v}%`} />}
                cursor={{ fill: dash.panel2 }}
              />
              <Bar dataKey="pct" name="Facturatiegraad" radius={[6, 6, 0, 0]} maxBarSize={26}>
                {rateChartData.map((d, i) => (
                  <Cell key={i} fill={d.pct >= 70 ? dash.green : d.pct >= 50 ? dash.orange : dash.red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <ChartCard title="Omzet per status per maand" sub="Gestapeld · Excl. BTW">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedChartData}>
              <CartesianGrid vertical={false} stroke={dash.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={{ stroke: dash.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `€${Math.round(v / 1000)}K`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
                cursor={{ fill: dash.panel2 }}
              />
              <Legend wrapperStyle={{ fontSize: 10, color: dash.mutedLight }} />
              {stacked.series.map((s) => (
                <Bar key={s.status} dataKey={s.status} stackId="a" fill={statusColor(s.status)} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Open omzet per status" sub="Niet-gefactureerd · Alle maanden">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={open} dataKey="value" nameKey="status" innerRadius={45} outerRadius={78} paddingAngle={1}>
                {open.map((s) => (
                  <Cell key={s.status} fill={statusColor(s.status)} stroke={dash.panel} strokeWidth={2} />
                ))}
              </Pie>
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10, color: dash.mutedLight }} />
              <Tooltip
                formatter={(value, name) => [formatEuro(Number(value ?? 0)), String(name)]}
                contentStyle={{ background: dash.panel2, borderColor: dash.border, borderRadius: 8 }}
                labelStyle={{ color: dash.mutedLight }}
                itemStyle={{ color: dash.text }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Callout tone="warn">
        <b>Let op — aanmaakdatum vs. factuurdatum:</b> dit tabblad groepeert op aanmaakmaand van het project. Gebruik de{" "}
        <b>Maandoverleg-sectie</b> hieronder (op factuurdatum) voor AFAS-aansluiting.
      </Callout>

      <h3 className="mt-1 text-sm font-bold" style={{ color: dash.muted }}>
        Maandoverleg — op factuurdatum
      </h3>
      <KpiGrid>
        <KpiCard label="Totaal gefactureerd (factuurdatum)" value={formatEuro(totaalGefactFactuurdatum)} valueColor={dash.green} />
      </KpiGrid>
      <ChartCard title="Gefactureerd per maand (op factuurdatum)" sub="Excl. BTW">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={factuurdatumChartData}>
            <CartesianGrid vertical={false} stroke={dash.border} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={{ stroke: dash.border }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `€${Math.round(v / 1000)}K`} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
              cursor={{ fill: dash.panel2 }}
            />
            <Bar dataKey="Gefactureerd (factuurdatum)" fill="rgba(62,207,142,0.2)" stroke={dash.green} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <Callout tone="info">
        Structureel verschil tussen projectomzet (aanmaakmaand) en gefactureerd (factuurdatum) heeft drie oorzaken:
        timing, geannuleerde/gecrediteerde projecten, en directe AFAS-facturatie buiten Rentman om.
      </Callout>

      <h3 className="mt-1 text-sm font-bold" style={{ color: dash.muted }}>
        BV &amp; Categorie
      </h3>
      <KpiGrid>
        {BV_ORDER.map((name) => {
          const s = bv[name];
          const pct = s.omzet ? Math.round((1000 * s.gefact) / s.omzet) / 10 : 0;
          return (
            <KpiCard key={name} label={`${name} (${s.aantal} proj.)`} value={`${formatEuro(s.omzet)} · ${pct}%`} valueColor={BV_COLORS[name]} />
          );
        })}
      </KpiGrid>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <ChartCard title="Omzet per BV" sub="Gestapeld · Excl. BTW">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bvChartData}>
              <CartesianGrid vertical={false} stroke={dash.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={{ stroke: dash.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `€${Math.round(v / 1000)}K`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
                cursor={{ fill: dash.panel2 }}
              />
              <Legend wrapperStyle={{ fontSize: 10, color: dash.mutedLight }} />
              {BV_ORDER.map((name) => (
                <Bar key={name} dataKey={name} stackId="a" fill={BV_COLORS[name]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Verhuur vs. catering" sub="Gestapeld · Excl. BTW">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={catChartData}>
              <CartesianGrid vertical={false} stroke={dash.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={{ stroke: dash.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: dash.mutedLight }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `€${Math.round(v / 1000)}K`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content={(props: any) => <ChartTooltip {...props} formatValue={(v: number) => formatEuro(v)} />}
                cursor={{ fill: dash.panel2 }}
              />
              <Legend wrapperStyle={{ fontSize: 10, color: dash.mutedLight }} />
              {(["Verhuur", "Catering", "Overig"] as const).map((g) => (
                <Bar key={g} dataKey={g} stackId="a" fill={CAT_GROUP_COLORS[g]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <div className="rounded-[10px] border p-4" style={{ background: dash.panel, borderColor: dash.border }}>
          <h4 className="mb-2.5 text-[13px] font-bold" style={{ color: dash.muted }}>
            Omzet per BV per maand
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase" style={{ background: dash.panel2, color: dash.muted }}>BV</th>
                  {bvMaand.months.map((m) => (
                    <th key={m} className="px-2.5 py-1.5 text-right text-[10px] font-semibold uppercase" style={{ background: dash.panel2, color: dash.muted }}>
                      {formatMonthLabel(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BV_ORDER.map((name) => (
                  <tr key={name} className="border-t" style={{ borderColor: dash.border }}>
                    <td className="px-2.5 py-1.5 font-semibold" style={{ color: BV_COLORS[name] }}>{name}</td>
                    {bvMaand.series[name].map((v, i) => (
                      <td key={i} className="px-2.5 py-1.5 text-right" style={{ color: dash.text }}>{formatEuro(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[10px] border p-4" style={{ background: dash.panel, borderColor: dash.border }}>
          <h4 className="mb-2.5 text-[13px] font-bold" style={{ color: dash.muted }}>
            Omzet per categorie
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-[12px]">
              <thead>
                <tr>
                  {["Categorie", "Aantal", "Omzet"].map((h, i) => (
                    <th key={h} className="px-2.5 py-1.5 text-[10px] font-semibold uppercase" style={{ background: dash.panel2, color: dash.muted, textAlign: i === 0 ? "left" : "right" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categorieRows.map(([cat, v]) => (
                  <tr key={cat} className="border-t" style={{ borderColor: dash.border }}>
                    <td className="px-2.5 py-1.5" style={{ color: dash.text }}>{cat}</td>
                    <td className="px-2.5 py-1.5 text-right" style={{ color: dash.muted }}>{v.aantal}</td>
                    <td className="px-2.5 py-1.5 text-right font-semibold" style={{ color: dash.text }}>{formatEuro(v.omzet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Callout tone="info">
        <b>BV-bepaling:</b> naam start met &quot;EVENTO&quot; → EVENTO; anders magazijn /stocklocations/4 → M&amp;R
        Utrecht, /stocklocations/1 → M&amp;R Kampen, onbekend/leeg → M&amp;R Kampen (fallback). <b>Categorie:</b>{" "}
        afgeleid van het Rentman-projecttype; onbekend/geen match → &quot;Overig&quot;.
      </Callout>
    </div>
  );
}
