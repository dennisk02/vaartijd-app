import { dash } from "./colors";

/** KPI-kaart in de donkere dashboardstijl: paneelkleur, dunne rand, geen
 * geaccentueerde topborder meer -- de kleur zit alleen op de waarde zelf
 * (gebaseerd op een drempelwaarde), zoals de stijlgids voorschrijft. */
export function KpiCard({
  label,
  value,
  sub,
  valueColor,
  tint,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Niet meer gebruikt voor styling (donker thema heeft geen topborder-accent
   * meer) -- optioneel gehouden zodat bestaande call sites niet allemaal
   * aangepast hoeven te worden. */
  accent?: string;
  valueColor?: string;
  /** Zachte achtergrondkleur i.p.v. het standaard paneel, voor bv. "Direct opvolgen" op Opvolging. */
  tint?: string;
}) {
  return (
    <div className="rounded-[10px] border p-3.5" style={{ background: tint ?? dash.panel, borderColor: dash.border }}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: dash.muted }}>
        {label}
      </div>
      <div className="text-[22px] font-bold" style={{ color: valueColor ?? dash.text }}>
        {value}
      </div>
      {sub && (
        <div className="truncate text-[11px]" style={{ color: dash.mutedLight }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">{children}</div>;
}

/** Toelichtingsblokje met linker accentrand -- "warn" voor kanttekeningen/
 * databeperkingen, "info" voor neutrale uitleg. Bewust geen volledige
 * kaderbox meer (donker-thema-stijlgids: alleen een linkeraccentrand). */
export function Callout({ tone, children }: { tone: "warn" | "info"; children: React.ReactNode }) {
  const border = tone === "warn" ? dash.orange : dash.accent;
  const bg = tone === "warn" ? dash.warnBg : dash.infoBg;
  const text = tone === "warn" ? dash.warnText : dash.text;
  return (
    <div
      className="mb-3.5 rounded-lg px-4 py-2.5 text-xs leading-relaxed"
      style={{ background: bg, borderLeft: `3px solid ${border}`, color: text }}
    >
      {children}
    </div>
  );
}

export function ChartCard({ title, sub, height = 280, children }: { title: string; sub: string; height?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border p-4" style={{ background: dash.panel, borderColor: dash.border }}>
      <h2 className="mb-0.5 text-[13px] font-bold" style={{ color: dash.muted }}>
        {title}
      </h2>
      <p className="mb-2.5 text-[11px]" style={{ color: dash.mutedLight }}>
        {sub}
      </p>
      <div style={{ height }}>{children}</div>
    </div>
  );
}
