import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { OverzichtDashboard } from "@/components/traction/overzicht-dashboard";

export default async function TractionOverzichtPage({ searchParams }: { searchParams: Promise<{ jaar?: string }> }) {
  await requireAdminScope("TRACTION");
  const { jaar } = await searchParams;

  const years = await prisma.tractionYear.findMany({ orderBy: { year: "desc" } });
  const year = jaar ? Number(jaar) : years[0]?.year ?? new Date().getFullYear();

  const [rocks, colleagues] = await Promise.all([
    prisma.rock.findMany({ where: { year }, include: { owner: true }, orderBy: { month: "asc" } }),
    prisma.colleague.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const rockRows = rocks.map((r) => ({
    id: r.id,
    month: r.month,
    task: r.task,
    ownerId: r.ownerId,
    ownerName: r.owner?.name ?? null,
    status: r.status,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-lg font-semibold" style={{ color: "#0A1F27" }}>
          Overzicht
        </h1>
        <p className="text-sm" style={{ color: "#4B5D5C" }}>
          Voortgang, drukte per maand en werkdruk per collega voor {year}.
        </p>
      </div>

      {rockRows.length === 0 ? (
        <p className="text-sm" style={{ color: "#4B5D5C" }}>
          Nog geen taken voor {year} -- voeg ze toe op het tabblad Taken.
        </p>
      ) : (
        <OverzichtDashboard rocks={rockRows} colleagues={colleagues.map((c) => ({ id: c.id, name: c.name }))} year={year} />
      )}
    </div>
  );
}
