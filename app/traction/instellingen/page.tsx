import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { Card, Button } from "@/components/ui";
import { moveStatusOption } from "@/lib/actions/traction";
import { StatusOptionForm } from "@/components/traction/status-option-form";
import { DeleteStatusButton } from "@/components/traction/delete-status-button";

/** Statusopties zijn bewust configureerbaar (geen vaste enum) -- zie
 * HANDOVER §10.9. Verwijderen is geblokkeerd zolang een taak deze status
 * nog gebruikt (deleteStatusOption() checkt dit). */
export default async function TractionInstellingenPage() {
  await requireAdminScope("TRACTION");
  const options = await prisma.rockStatusOption.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-red-800">Statusopties</h1>
        <p className="text-sm text-slate-500">
          Deze statussen zijn te kiezen bij een taak op het dashboard. Volgorde hier bepaalt de volgorde in de
          keuzelijsten.
        </p>
      </div>

      <Card>
        <StatusOptionForm />
      </Card>

      <Card>
        {options.length === 0 ? (
          <p className="text-sm text-slate-500">Nog geen statussen -- voeg er hierboven een toe.</p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-medium text-slate-900">{option.label}</span>
                <div className="flex items-center gap-1.5">
                  <form action={moveStatusOption.bind(null, option.id, "up")}>
                    <Button type="submit" variant="secondary" className="px-2 py-1 text-xs" disabled={index === 0}>
                      ↑
                    </Button>
                  </form>
                  <form action={moveStatusOption.bind(null, option.id, "down")}>
                    <Button
                      type="submit"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      disabled={index === options.length - 1}
                    >
                      ↓
                    </Button>
                  </form>
                  <DeleteStatusButton id={option.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
