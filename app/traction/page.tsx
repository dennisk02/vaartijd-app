import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { Card } from "@/components/ui";
import { RockForm } from "@/components/traction/rock-form";
import { RocksBoard } from "@/components/traction/rocks-board";

export default async function TractionDashboardPage() {
  await requireAdminScope("TRACTION");

  const [rocks, colleagues, statusOptions] = await Promise.all([
    prisma.rock.findMany({
      include: { owner: true, updates: { include: { author: true }, orderBy: { createdAt: "desc" } } },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    }),
    prisma.colleague.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.rockStatusOption.findMany({ orderBy: { order: "asc" } }),
  ]);

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
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-red-800">Traction</h1>
        <p className="text-sm text-slate-500">Taken per maand, met eigenaar en status. Alleen zichtbaar voor directie.</p>
      </div>

      <Card>
        <RockForm colleagues={colleagueOptions} statusOptions={statusLabels} />
      </Card>

      <RocksBoard rocks={rockRows} colleagues={colleagueOptions} statusOptions={statusLabels} />
    </div>
  );
}
