import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { ColleagueForm } from "@/components/traction/colleague-form";
import { ColleagueList } from "@/components/traction/colleague-list";
import { traction } from "@/components/traction/colors";

export default async function TractionCollegasPage() {
  await requireAdminScope("TRACTION");
  const colleagues = await prisma.colleague.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-lg font-semibold" style={{ color: traction.navyDeep }}>
          Collega&apos;s
        </h1>
        <p className="text-sm" style={{ color: traction.inkSoft }}>
          Deze lijst is los van de medewerkersaccounts van de app -- puur om taken aan toe te wijzen. Bij
          deactiveren van iemand met nog openstaande taken moet je die eerst overdragen.
        </p>
      </div>

      <div className="rounded-lg border p-4" style={{ background: traction.paper, borderColor: traction.line }}>
        <ColleagueForm />
      </div>

      <div className="rounded-lg border p-4" style={{ background: traction.paper, borderColor: traction.line }}>
        <ColleagueList colleagues={colleagues} />
      </div>
    </div>
  );
}
