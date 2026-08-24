import { Card } from "@/components/ui";
import { formatEuro } from "./format";

export function PendingTab({
  projects,
}: {
  projects: {
    id: string;
    name: string;
    rentmanProjectNumber: string | null;
    status: string;
    revenue: number;
    planperiodStart: Date | null;
  }[];
}) {
  const totalRevenue = projects.reduce((sum, p) => sum + p.revenue, 0);
  const sorted = [...projects].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border-t-4 border-blue-500 bg-white p-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Optie &amp; aanvraag</div>
          <div className="text-lg font-extrabold text-blue-600">{projects.length} proj.</div>
        </div>
        <div className="rounded-xl border-t-4 border-blue-500 bg-white p-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Omzet nog te bevestigen</div>
          <div className="text-lg font-extrabold text-blue-600">{formatEuro(totalRevenue)}</div>
        </div>
      </div>

      <Card className="p-0">
        <p className="p-4 pb-0 text-sm text-slate-500">
          Alle projecten met status &quot;Optie&quot; of &quot;Aanvraag&quot; -- gesorteerd op omzet, hoogste eerst.
        </p>
        <div className="mt-3 divide-y divide-slate-100">
          {sorted.length === 0 && <p className="p-4 text-sm text-slate-500">Niets openstaand.</p>}
          {sorted.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  p.status === "Optie" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {p.status}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {p.rentmanProjectNumber ? `${p.rentmanProjectNumber} · ` : ""}
                  {p.name}
                </p>
                {p.planperiodStart && (
                  <p className="text-xs text-slate-400">{p.planperiodStart.toLocaleDateString("nl-NL")}</p>
                )}
              </div>
              <span className="text-sm font-bold text-slate-700">{formatEuro(p.revenue)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
