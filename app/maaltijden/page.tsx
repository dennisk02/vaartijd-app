import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getShipOptionsForUser } from "@/lib/assignments";
import { getDictionary } from "@/lib/i18n";
import { NavBar } from "@/components/nav";
import { Card } from "@/components/ui";
import { MealCountForm } from "@/components/meal-count-form";

export default async function MaaltijdenPage() {
  const user = await getUser();
  const dict = getDictionary(user.language);
  const mealLabels: Record<string, string> = {
    BREAKFAST: dict.breakfast,
    LUNCH: dict.lunch,
    DINNER: dict.dinner,
  };

  const navProps = {
    userName: user.name,
    isAdmin: user.role === "ADMIN",
    language: user.language,
    dict,
    canLogOccupancy: user.canLogOccupancy,
    canLogMeals: user.canLogMeals,
    canLogWaste: user.canLogWaste,
  };

  if (!user.canLogMeals) {
    return (
      <>
        <NavBar {...navProps} />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
          <h1 className="text-xl font-semibold text-red-800">{dict.tMeals}</h1>
          <Card className="text-sm text-slate-500">
            Deze functie is voor jou niet ingeschakeld door de beheerder.
          </Card>
        </main>
      </>
    );
  }

  const [ships, meals] = await Promise.all([
    getShipOptionsForUser(user.id, user.projectGroup),
    prisma.mealCount.findMany({
      include: { ship: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  return (
    <>
      <NavBar {...navProps} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <h1 className="text-xl font-semibold text-red-800">{dict.tMeals}</h1>
        <p className="text-sm text-slate-500">{dict.mealsSub}</p>

        <Card>
          <MealCountForm ships={ships.map((s) => ({ id: s.id, name: s.name }))} dict={dict} />
        </Card>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-slate-500">{dict.tHistory}</h2>
          {meals.length === 0 && <p className="text-sm text-slate-500">{dict.noEntries}</p>}
          {meals.map((entry) => (
            <Card key={entry.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {entry.ship.name} · {mealLabels[entry.mealType]}
                </p>
                <p className="text-sm text-slate-500">{entry.date.toISOString().slice(0, 10)}</p>
              </div>
              <p className="text-lg font-semibold text-red-800">{entry.countServed}</p>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
