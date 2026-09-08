import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { DoelenCategorySection } from "@/components/traction/doelen-section";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "financial", label: "Financieel" },
  { key: "core_focus", label: "Kernfocus" },
  { key: "kpi", label: "KPI's" },
  { key: "core_values_measurement", label: "Kernwaarden-meting" },
];

export default async function TractionDoelenPage({ searchParams }: { searchParams: Promise<{ jaar?: string }> }) {
  await requireAdminScope("TRACTION");
  const { jaar } = await searchParams;

  const years = await prisma.tractionYear.findMany({ orderBy: { year: "desc" } });
  const year = jaar ? Number(jaar) : years[0]?.year ?? new Date().getFullYear();

  const [groups, statusOptions] = await Promise.all([
    prisma.goalCategoryGroup.findMany({
      where: { year },
      include: { items: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    }),
    prisma.goalStatusOption.findMany({ orderBy: { order: "asc" } }),
  ]);

  const statusLabels = statusOptions.map((s) => s.label);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-lg font-semibold" style={{ color: "#0A1F27" }}>
          Doelen {year}
        </h1>
        <p className="text-sm" style={{ color: "#4B5D5C" }}>
          Financiële doelen, kernfocus, KPI&apos;s en kernwaarden-meting voor dit jaar.
        </p>
      </div>

      {CATEGORIES.map(({ key, label }) => {
        const categoryGroups = groups
          .filter((g) => g.category === key)
          .map((g) => ({
            id: g.id,
            title: g.title,
            items: g.items.map((i) => ({ id: i.id, label: i.label, target: i.target, status: i.status })),
          }));
        return (
          <section key={key}>
            <h2 className="mb-3 text-base font-semibold" style={{ color: "#123240" }}>
              {label}
            </h2>
            <DoelenCategorySection category={key} year={year} groups={categoryGroups} statusOptions={statusLabels} />
          </section>
        );
      })}
    </div>
  );
}
