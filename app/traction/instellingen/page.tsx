import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { moveStatusOption, moveGoalStatusOption, createStatusOption, createGoalStatusOption, deleteStatusOption, deleteGoalStatusOption } from "@/lib/actions/traction";
import { StatusOptionForm } from "@/components/traction/status-option-form";
import { DeleteStatusButton } from "@/components/traction/delete-status-button";
import { CoreValuesEditor } from "@/components/traction/core-values-editor";
import { OrgSettingsForm } from "@/components/traction/org-settings-form";
import { traction } from "@/components/traction/colors";

export default async function TractionInstellingenPage() {
  await requireAdminScope("TRACTION");

  const [rockStatusOptions, goalStatusOptions, coreValues, org] = await Promise.all([
    prisma.rockStatusOption.findMany({ orderBy: { order: "asc" } }),
    prisma.goalStatusOption.findMany({ orderBy: { order: "asc" } }),
    prisma.coreValue.findMany({ orderBy: { order: "asc" } }),
    prisma.tractionOrg.findUnique({ where: { id: "singleton" } }),
  ]);

  return (
    <div className="flex flex-col gap-9">
      <section>
        <h1 className="mb-1 text-lg font-semibold" style={{ color: traction.navyDeep }}>
          Instellingen
        </h1>
        <p className="text-sm" style={{ color: traction.inkSoft }}>
          Bedrijfsnaam, kernwaarden en de statuslijsten voor taken en doelen.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold" style={{ color: traction.navy }}>
          Organisatie
        </h2>
        <div className="rounded-lg border p-4" style={{ background: traction.paper, borderColor: traction.line }}>
          <OrgSettingsForm company={org?.company ?? ""} tagline={org?.tagline ?? ""} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold" style={{ color: traction.navy }}>
          Kernwaarden
        </h2>
        <CoreValuesEditor coreValues={coreValues} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold" style={{ color: traction.navy }}>
          Statusopties -- Taken
        </h2>
        <p className="mb-3 text-sm" style={{ color: traction.inkSoft }}>
          Deze statussen zijn te kiezen bij een taak op het tabblad Taken. Volgorde hier bepaalt de volgorde in de
          keuzelijsten.
        </p>
        <div className="mb-3 rounded-lg border p-4" style={{ background: traction.paper, borderColor: traction.line }}>
          <StatusOptionForm action={createStatusOption} label="Nieuwe status" />
        </div>
        <div className="rounded-lg border p-4" style={{ background: traction.paper, borderColor: traction.line }}>
          {rockStatusOptions.length === 0 ? (
            <p className="text-sm" style={{ color: traction.inkSoft }}>Nog geen statussen -- voeg er hierboven een toe.</p>
          ) : (
            <div className="flex flex-col">
              {rockStatusOptions.map((option, index) => (
                <div key={option.id} className="flex items-center justify-between gap-3 border-t py-2.5 first:border-t-0" style={{ borderColor: traction.line }}>
                  <span className="text-sm font-medium" style={{ color: traction.ink }}>{option.label}</span>
                  <div className="flex items-center gap-1.5">
                    <form action={moveStatusOption.bind(null, option.id, "up")}>
                      <button type="submit" disabled={index === 0} className="rounded-md border px-2 py-1 text-xs disabled:opacity-40" style={{ borderColor: traction.line, color: traction.inkSoft }}>↑</button>
                    </form>
                    <form action={moveStatusOption.bind(null, option.id, "down")}>
                      <button type="submit" disabled={index === rockStatusOptions.length - 1} className="rounded-md border px-2 py-1 text-xs disabled:opacity-40" style={{ borderColor: traction.line, color: traction.inkSoft }}>↓</button>
                    </form>
                    <DeleteStatusButton id={option.id} action={deleteStatusOption} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold" style={{ color: traction.navy }}>
          Statusopties -- Doelen
        </h2>
        <p className="mb-3 text-sm" style={{ color: traction.inkSoft }}>
          Losse statuslijst voor items op het tabblad Doelen.
        </p>
        <div className="mb-3 rounded-lg border p-4" style={{ background: traction.paper, borderColor: traction.line }}>
          <StatusOptionForm action={createGoalStatusOption} label="Nieuwe status" />
        </div>
        <div className="rounded-lg border p-4" style={{ background: traction.paper, borderColor: traction.line }}>
          {goalStatusOptions.length === 0 ? (
            <p className="text-sm" style={{ color: traction.inkSoft }}>Nog geen statussen -- voeg er hierboven een toe.</p>
          ) : (
            <div className="flex flex-col">
              {goalStatusOptions.map((option, index) => (
                <div key={option.id} className="flex items-center justify-between gap-3 border-t py-2.5 first:border-t-0" style={{ borderColor: traction.line }}>
                  <span className="text-sm font-medium" style={{ color: traction.ink }}>{option.label}</span>
                  <div className="flex items-center gap-1.5">
                    <form action={moveGoalStatusOption.bind(null, option.id, "up")}>
                      <button type="submit" disabled={index === 0} className="rounded-md border px-2 py-1 text-xs disabled:opacity-40" style={{ borderColor: traction.line, color: traction.inkSoft }}>↑</button>
                    </form>
                    <form action={moveGoalStatusOption.bind(null, option.id, "down")}>
                      <button type="submit" disabled={index === goalStatusOptions.length - 1} className="rounded-md border px-2 py-1 text-xs disabled:opacity-40" style={{ borderColor: traction.line, color: traction.inkSoft }}>↓</button>
                    </form>
                    <DeleteStatusButton id={option.id} action={deleteGoalStatusOption} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
