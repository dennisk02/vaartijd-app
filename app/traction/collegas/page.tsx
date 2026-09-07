import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { Card } from "@/components/ui";
import { ColleagueForm } from "@/components/traction/colleague-form";
import { ColleagueList } from "@/components/traction/colleague-list";

export default async function TractionCollegasPage() {
  await requireAdminScope("TRACTION");
  const colleagues = await prisma.colleague.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-red-800">Collega&apos;s</h1>
        <p className="text-sm text-slate-500">
          Deze lijst is los van de medewerkersaccounts van de app -- puur om taken aan toe te wijzen. Bij
          deactiveren van iemand met nog openstaande taken moet je die eerst overdragen.
        </p>
      </div>

      <Card>
        <ColleagueForm />
      </Card>

      <Card>
        <ColleagueList colleagues={colleagues} />
      </Card>
    </div>
  );
}
