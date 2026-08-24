import { dash } from "./colors";

/** KPI-kaart die de exacte stijl van het referentiedashboard volgt: witte
 * kaart, afgeronde hoeken, zachte schaduw, gekleurde 3px topborder. */
export function KpiCard({
  label,
  value,
  sub,
  accent,
  valueColor,
  tint,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  valueColor?: string;
  /** Zachte achtergrondkleur i.p.v. wit, voor bv. "Direct opvolgen" op Opvolging. */
  tint?: string;
}) {
  return (
    <div
      className="rounded-[10px] p-3.5 shadow-sm"
      style={{ background: tint ?? "#fff", borderTop: `3px solid ${accent}`, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: dash.muted }}>
        {label}
      </div>
      <div className="text-[22px] font-bold" style={{ color: valueColor ?? dash.heading }}>
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

export function Callout({ tone, children }: { tone: "warn" | "info"; children: React.ReactNode }) {
  const bg = tone === "warn" ? dash.warnBg : dash.infoBg;
  const border = tone === "warn" ? dash.warnBorder : dash.infoBorder;
  const text = tone === "warn" ? dash.warnText : dash.infoText;
  return (
    <div className="mb-3.5 rounded-[10px] border px-4 py-2.5 text-xs leading-relaxed" style={{ background: bg, borderColor: border, color: text }}>
      {children}
    </div>
  );
}

export function ChartCard({ title, sub, height = 220, children }: { title: string; sub: string; height?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] bg-white p-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
      <h2 className="mb-0.5 text-[13px] font-bold" style={{ color: dash.heading }}>
        {title}
      </h2>
      <p className="mb-2.5 text-[11px]" style={{ color: dash.mutedLight }}>
        {sub}
      </p>
      <div style={{ height }}>{children}</div>
    </div>
  );
}
