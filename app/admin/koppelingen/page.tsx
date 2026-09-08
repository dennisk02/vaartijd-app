import { forbidden } from "next/navigation";
import { getUser } from "@/lib/dal";
import { TabSwitcher } from "@/components/admin/tab-switcher";
import { AfasPageContent } from "@/app/admin/afas/page";
import { RentmanAfasPageContent } from "@/app/admin/rentman-afas/page";
import { ShiftbasePageContent } from "@/app/admin/shiftbase/page";

/**
 * Koppelingen (sep 2026) -- AFAS-koppeling/Rentman → AFAS/Shiftbase
 * samengevoegd onder één tabblad, op verzoek van de klant. AFAS-koppeling
 * en Rentman → AFAS delen dezelfde scope (AFAS) en verschijnen dus samen;
 * Shiftbase heeft zijn eigen scope. De losse routes (/admin/afas,
 * /admin/rentman-afas, /admin/shiftbase) blijven ook rechtstreeks
 * bereikbaar.
 */
export default async function AdminKoppelingenPage() {
  const user = await getUser();
  const hasScope = (scope: "AFAS" | "SHIFTBASE") => user.role === "ADMIN" || user.adminScopes.includes(scope);

  const tabs: { id: string; label: string; content: React.ReactNode }[] = [];
  if (hasScope("AFAS")) {
    tabs.push({ id: "afas", label: "AFAS-koppeling", content: <AfasPageContent /> });
    tabs.push({ id: "rentman-afas", label: "Rentman → AFAS", content: <RentmanAfasPageContent /> });
  }
  if (hasScope("SHIFTBASE")) tabs.push({ id: "shiftbase", label: "Shiftbase", content: <ShiftbasePageContent /> });

  if (tabs.length === 0) forbidden();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-red-800">Koppelingen</h1>
        <p className="text-sm text-slate-500">AFAS, Rentman → AFAS en Shiftbase.</p>
      </div>
      {/* Geen omliggende Card hier -- het Rentman → AFAS-tabblad breekt zelf
          bewust uit naar volle schermbreedte (full-bleed, zie
          RentmanAfasPageContent), wat niet samengaat met een omringende
          Card-rand. De andere tabbladen hebben hun eigen Card-secties al. */}
      <TabSwitcher tabs={tabs} />
    </div>
  );
}
