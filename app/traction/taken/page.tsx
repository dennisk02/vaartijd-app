import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { RockForm } from "@/components/traction/rock-form";
import { RocksBoard, MONTH_NAMES } from "@/components/traction/rocks-board";
import { defaultTractionYear } from "@/lib/traction-year";

function periodLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export default async function TractionTakenPage({ searchParams }: { searchParams: Promise<{ jaar?: string }> }) {
  await requireAdminScope("TRACTION");
  const { jaar } = await searchParams;

  const [rocks, colleagues, statusOptions, years] = await Promise.all([
    prisma.rock.findMany({
      include: {
        owner: true,
        updates: { include: { author: true }, orderBy: { createdAt: "desc" } },
        carriedFrom: { select: { year: true, month: true } },
        carriedTo: { select: { year: true, month: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    }),
    prisma.colleague.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.rockStatusOption.findMany({ orderBy: { order: "asc" } }),
    prisma.tractionYear.findMany({ orderBy: { year: "asc" } }),
  ]);

  const currentYear = jaar ? Number(jaar) : defaultTractionYear(years.map((y) => y.year));
  const now = new Date();
  const defaultPeriod = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const colleagueOptions = colleagues.map((c) => ({ id: c.id, name: c.name }));
  const statusLabels = statusOptions.map((s) => s.label);

  const rockRows = rocks.map((r) => ({
    id: r.id,
    year: r.year,
    month: r.month,
    task: r.task,
    ownerId: r.ownerId,
    ownerName: r.owner?.name ?? null,
    status: r.status,
    updates: r.updates.map((u) => ({
      id: u.id,
      note: u.note,
      createdAt: u.createdAt.toISOString(),
      authorName: u.author.name,
    })),
    carriedFromLabel: r.carriedFrom ? periodLabel(r.carriedFrom.year, r.carriedFrom.month) : null,
    carriedToLabel: r.carriedTo ? periodLabel(r.carriedTo.year, r.carriedTo.month) : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-lg font-semibold" style={{ color: "#0A1F27" }}>
          Taken
        </h1>
        <p className="text-sm" style={{ color: "#4B5D5C" }}>
          Rocks per maand, met eigenaar, status en voortgangsnotities.
        </p>
      </div>

      <RockForm colleagues={colleagueOptions} statusOptions={statusLabels} year={currentYear} month={now.getMonth() + 1} />
      <RocksBoard rocks={rockRows} colleagues={colleagueOptions} statusOptions={statusLabels} defaultPeriod={defaultPeriod} />
    </div>
  );
}
