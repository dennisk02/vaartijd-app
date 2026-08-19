import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CheckboxGroup, Select, Input, Field, Button } from "@/components/ui";
import { SearchableCheckboxGroup } from "@/components/searchable-checkbox-group";
import { DefaultProjectPicker } from "@/components/admin/default-project-picker";
import { updateUserAssignments } from "@/lib/actions/admin";

export default async function UserAssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [user, projects, ships] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        assignedProjects: { select: { id: true } },
        assignedShips: { select: { id: true } },
      },
    }),
    prisma.project.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, rentmanProjectNumber: true },
    }),
    prisma.ship.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/users" className="text-sm text-red-700 hover:underline">
          ← Terug naar medewerkers
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-red-800">Toewijzingen voor {user.name}</h1>
        <p className="text-sm text-slate-500">
          Wijs projecten en schepen toe die deze medewerker mag gebruiken. Zonder toewijzing ziet de
          medewerker alle actieve projecten/schepen.
        </p>
      </div>

      <Card>
        <form action={updateUserAssignments.bind(null, user.id)} className="flex flex-col gap-6">
          <div>
            <h2 className="mb-2 text-sm font-medium text-slate-700">Projectgroep</h2>
            <p className="mb-3 text-xs text-slate-500">
              Beperkt welke projecten deze medewerker standaard ziet bij urenregistratie (op basis van
              projectnaam: begint met &quot;EVENTO - &quot; = Evento, anders Events). Geldt alleen zolang er
              hieronder geen specifieke projecten zijn aangevinkt.
            </p>
            <Select name="projectGroup" defaultValue={user.projectGroup}>
              <option value="ALL">Alle projecten (geen beperking)</option>
              <option value="EVENTS">Alleen Events (administratie 02)</option>
              <option value="EVENTO">Alleen Evento (administratie 21)</option>
            </Select>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-slate-700">Projecten</h2>
            <p className="mb-3 text-xs text-slate-500">
              Handmatig specifieke projecten toewijzen overschrijft de projectgroep hierboven.
            </p>
            <SearchableCheckboxGroup
              name="projectIds"
              items={projects.map((p) => ({
                id: p.id,
                label: p.rentmanProjectNumber ? `${p.rentmanProjectNumber} · ${p.name}` : p.name,
              }))}
              defaultCheckedIds={user.assignedProjects.map((p) => p.id)}
              searchPlaceholder="Zoek op naam of nummer..."
              noResultsLabel="Geen projecten gevonden."
              selectedLabel="geselecteerd"
            />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-medium text-slate-700">Schepen</h2>
            <CheckboxGroup
              name="shipIds"
              items={ships.map((s) => ({ id: s.id, label: s.name }))}
              defaultCheckedIds={user.assignedShips.map((s) => s.id)}
            />
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="mb-2 text-sm font-medium text-slate-700">Onderdelen beschikbaar voor deze medewerker</h2>
            <p className="mb-3 text-xs text-slate-500">
              Uren registreren staat altijd aan. Zet hieronder uit wat deze medewerker niet nodig heeft.
            </p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="canLogOccupancy"
                  defaultChecked={user.canLogOccupancy}
                  className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-600"
                />
                Scheepsbezetting
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="canLogMeals"
                  defaultChecked={user.canLogMeals}
                  className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-600"
                />
                Maaltijden
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="canLogWaste"
                  defaultChecked={user.canLogWaste}
                  className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-600"
                />
                Voedselverspilling
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="mb-2 text-sm font-medium text-slate-700">Vast project voor urenregistratie</h2>
            <p className="mb-3 text-xs text-slate-500">
              Als dit aan staat, hoeft de medewerker bij het registreren van uren geen project meer te
              kiezen -- het onderstaande project wordt altijd gebruikt.
            </p>
            <div className="flex flex-col gap-3">
              <DefaultProjectPicker
                projects={projects.map((p) => ({ id: p.id, name: p.name, number: p.rentmanProjectNumber }))}
                defaultProjectId={user.defaultProjectId ?? ""}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="useDefaultProject"
                  defaultChecked={user.useDefaultProject}
                  className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-600"
                />
                Vast project gebruiken (project-keuze uitschakelen)
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="mb-2 text-sm font-medium text-slate-700">Shiftbase-koppeling</h2>
            <p className="mb-3 text-xs text-slate-500">
              Medewerker-ID zoals gebruikt in Shiftbase, nodig om uren daarnaartoe te exporteren.
            </p>
            <Field label="Shiftbase medewerker-ID (optioneel)" htmlFor="shiftbaseEmployeeId">
              <Input id="shiftbaseEmployeeId" name="shiftbaseEmployeeId" defaultValue={user.shiftbaseEmployeeId ?? ""} />
            </Field>
          </div>

          <Button type="submit">Instellingen opslaan</Button>
        </form>
      </Card>
    </div>
  );
}
