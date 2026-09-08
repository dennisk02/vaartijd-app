import Image from "next/image";
import { Roboto_Slab, Inter, IBM_Plex_Mono } from "next/font/google";
import { requireAdminScope } from "@/lib/dal";
import { NavBar } from "@/components/nav";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { traction } from "@/components/traction/colors";
import { KernwaardenStrip } from "@/components/traction/kernwaarden-strip";
import { TractionTabs } from "@/components/traction/tabs";
import { YearSelector } from "@/components/traction/year-selector";

const robotoSlab = Roboto_Slab({ variable: "--font-roboto-slab", subsets: ["latin"], weight: ["400", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

/**
 * Taak/toewijzingsmodule (§10.9) -- eigen route buiten /admin, gated op
 * AdminScope.TRACTION. Look & feel (navy/koper/papier, Roboto Slab/Inter/
 * IBM Plex Mono) 1-op-1 overgenomen uit het originele VBB Traction
 * Organizer-bestand (7-8 sep 2026), zie HANDOVER §10.9. De lettertype- en
 * `font-serif`/`font-mono`-CSS-variabelen worden hier bewust lokaal
 * overschreven (i.p.v. globaal in app/globals.css) zodat de rest van de app
 * zijn eigen Manrope-lettertype behoudt.
 */
export default async function TractionLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminScope("TRACTION");

  const [org, coreValues, years] = await Promise.all([
    prisma.tractionOrg.findUnique({ where: { id: "singleton" } }),
    prisma.coreValue.findMany({ orderBy: { order: "asc" } }),
    prisma.tractionYear.findMany({ orderBy: { year: "asc" } }),
  ]);

  const yearNumbers = years.map((y) => y.year);
  const currentYear = yearNumbers.length > 0 ? yearNumbers[yearNumbers.length - 1] : new Date().getFullYear();

  return (
    <div
      className={`${robotoSlab.variable} ${inter.variable} ${plexMono.variable}`}
      style={
        {
          fontFamily: "var(--font-inter), sans-serif",
          "--font-serif": "var(--font-roboto-slab)",
          "--font-mono": "var(--font-plex-mono)",
        } as React.CSSProperties
      }
    >
      <NavBar userName={user.name} isAdmin language="NL" dict={getDictionary("NL")} showEmployeeNav={false} />

      <header
        className="border-b-4 px-7 pb-[18px] pt-[22px]"
        style={{ background: `linear-gradient(180deg, ${traction.navy} 0%, ${traction.navyDeep} 100%)`, borderColor: traction.brass, color: "#EFEFE9" }}
      >
        <div className="mx-auto flex max-w-[1180px] items-center gap-[18px]">
          <div className="flex h-[74px] w-[74px] flex-shrink-0 items-center justify-center rounded-[10px] bg-white shadow-md">
            <Image src="/traction-logo.png" alt="" width={64} height={64} className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: traction.brassSoft }}>
              Vision / Traction Organizer
            </div>
            <h1 className="m-0 font-serif text-[22px] font-bold leading-tight text-white">{org?.company || "Traction"}</h1>
            {org?.tagline && <div className="mt-0.5 text-[13px]" style={{ color: "#B9C7C9" }}>{org.tagline}</div>}
          </div>
          <YearSelector years={yearNumbers} currentYear={currentYear} />
        </div>
      </header>

      <KernwaardenStrip coreValues={coreValues} />
      <TractionTabs />

      <main className="mx-auto max-w-[1180px] px-7 pb-16">
        <div className="mt-3.5 rounded-[10px] border p-6" style={{ background: traction.paperCard, borderColor: traction.line, color: traction.ink }}>
          {children}
        </div>
      </main>
    </div>
  );
}
