import { Card } from "@/components/ui";
import { formatEuro, formatMonthLabel } from "./format";

export type StatusBreakdown = Record<string, { count: number; revenue: number; invoiced: number }>;

const STATUS_COLORS: Record<string, string> = {
  Bevestigd: "#10B981",
  Klaargezet: "#10B981",
  "Op locatie": "#10B981",
  "Schoonmaken & nakijken": "#10B981",
  "Retour ophalen": "#10B981",
  Optie: "#3B82F6",
  Aanvraag: "#F59E0B",
  Concept: "#9CA3AF",
  Geannuleerd: "#EF4444",
  Retour: "#6B7280",
};

export function PerMonthTab({
  months,
}: {
  months: { month: string; totalRevenue: number; statusBreakdown: StatusBreakdown }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {months.length === 0 && <Card className="text-sm text-slate-500">Nog geen data berekend.</Card>}
      {months.map((m) => {
        const statuses = Object.entries(m.statusBreakdown).sort((a, b) => b[1].revenue - a[1].revenue);
        return (
          <Card key={m.month}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-slate-800">{formatMonthLabel(m.month)}</h2>
              <span className="text-sm font-bold text-slate-700">{formatEuro(m.totalRevenue)}</span>
            </div>
            <div className="flex flex-col gap-2">
              {statuses.map(([status, data]) => {
                const pct = m.totalRevenue > 0 ? Math.round((data.revenue / m.totalRevenue) * 100) : 0;
                const color = STATUS_COLORS[status] ?? "#9CA3AF";
                return (
                  <div key={status}>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span className="font-semibold" style={{ color }}>
                        {status} <span className="font-normal text-slate-400">({data.count})</span>
                      </span>
                      <span className="font-semibold text-slate-700">{formatEuro(data.revenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
