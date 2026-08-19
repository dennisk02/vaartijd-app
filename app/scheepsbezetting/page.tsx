import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getShipOptionsForUser } from "@/lib/assignments";
import { getDictionary } from "@/lib/i18n";
import { NavBar } from "@/components/nav";
import { Card } from "@/components/ui";
import { ShipOccupancyForm } from "@/components/ship-occupancy-form";

export default async function ScheepsbezettingPage() {
  const user = await getUser();
  const dict = getDictionary(user.language);
  const dayPartLabels: Record<string, string> = { DAY: dict.day, NIGHT: dict.night };

  const navProps = {
    userName: user.name,
    isAdmin: user.role === "ADMIN",
    language: user.language,
    dict,
    canLogOccupancy: user.canLogOccupancy,
    canLogMeals: user.canLogMeals,
    canLogWaste: user.canLogWaste,
  };

  if (!user.canLogOccupancy) {
    return (
      <>
        <NavBar {...navProps} />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
          <h1 className="text-xl font-semibold text-red-800">{dict.tOccupancy}</h1>
          <Card className="text-sm text-slate-500">
            Deze functie is voor jou niet ingeschakeld door de beheerder.
          </Card>
        </main>
      </>
    );
  }

  const [ships, occupancies] = await Promise.all([
    getShipOptionsForUser(user.id),
    prisma.shipOccupancy.findMany({
      include: { ship: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  return (
    <>
      <NavBar {...navProps} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <h1 className="text-xl font-semibold text-red-800">{dict.tOccupancy}</h1>

        <Card>
          <ShipOccupancyForm
            ships={ships.map((s) => ({ id: s.id, name: s.name, capacity: s.capacity }))}
            dict={dict}
          />
        </Card>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-slate-500">{dict.tHistory}</h2>
          {occupancies.length === 0 && <p className="text-sm text-slate-500">{dict.noEntries}</p>}
          {occupancies.map((entry) => (
            <Card key={entry.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{entry.ship.name}</p>
                <p className="text-sm text-slate-500">
                  {entry.date.toISOString().slice(0, 10)} · {dayPartLabels[entry.dayPart]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-red-800">{entry.passengerCount + entry.crewCount}</p>
                <p className="text-xs text-slate-400">
                  {entry.passengerCount} {dict.passengers.toLowerCase()} · {entry.crewCount}{" "}
                  {dict.crew.toLowerCase()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
