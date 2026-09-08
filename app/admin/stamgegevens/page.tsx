import { forbidden } from "next/navigation";
import { getUser } from "@/lib/dal";
import { Card } from "@/components/ui";
import { TabSwitcher } from "@/components/admin/tab-switcher";
import { ProjectsPageContent } from "@/app/admin/projects/page";
import { ShipsPageContent } from "@/app/admin/ships/page";
import { UsersPageContent } from "@/app/admin/users/page";

/**
 * Stamgegevens (sep 2026) -- Projecten/Schepen/Medewerkers samengevoegd
 * onder één tabblad, op verzoek van de klant. Elk onderdeel behoudt zijn
 * eigen scope-check (PROJECTS/SHIPS/USERS): een gebruiker met bv. alleen
 * SHIPS ziet hier alleen het Schepen-tabblad, niet de andere twee. De losse
 * routes (/admin/projects, /admin/ships, /admin/users) blijven ook
 * rechtstreeks bereikbaar (bv. voor bestaande links zoals de "Schepen"-link
 * op /admin/koppelingen).
 */
export default async function AdminStamgegevensPage() {
  const user = await getUser();
  const hasScope = (scope: "PROJECTS" | "SHIPS" | "USERS") => user.role === "ADMIN" || user.adminScopes.includes(scope);

  const tabs: { id: string; label: string; content: React.ReactNode }[] = [];
  if (hasScope("PROJECTS")) tabs.push({ id: "projecten", label: "Projecten", content: <ProjectsPageContent /> });
  if (hasScope("SHIPS")) tabs.push({ id: "schepen", label: "Schepen", content: <ShipsPageContent /> });
  if (hasScope("USERS")) tabs.push({ id: "medewerkers", label: "Medewerkers", content: <UsersPageContent /> });

  if (tabs.length === 0) forbidden();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-red-800">Stamgegevens</h1>
        <p className="text-sm text-slate-500">Projecten, schepen en medewerkers.</p>
      </div>
      <Card>
        <TabSwitcher tabs={tabs} />
      </Card>
    </div>
  );
}
