import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getProjectOptionsForUser, getShipOptionsForUser } from "@/lib/assignments";
import { getActiveTimer } from "@/lib/timer";
import { getDictionary } from "@/lib/i18n";
import { NavBar } from "@/components/nav";
import { Card, SyncStatusBadge, Button } from "@/components/ui";
import { HoursEntry } from "@/components/hours-entry";
import { deleteTimeEntry } from "@/lib/actions/time-entries";

export default async function UrenPage() {
  const user = await getUser();
  const dict = getDictionary(user.language);

  const [projects, ships, entries, activeTimer] = await Promise.all([
    getProjectOptionsForUser(user.id, user.projectGroup),
    getShipOptionsForUser(user.id),
    prisma.timeEntry.findMany({
      where: { userId: user.id },
      include: { project: true, ship: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
    getActiveTimer(user.id),
  ]);

  return (
    <>
      <NavBar
        userName={user.name}
        isAdmin={user.role === "ADMIN"}
        language={user.language}
        dict={dict}
        canLogOccupancy={user.canLogOccupancy}
        canLogMeals={user.canLogMeals}
        canLogWaste={user.canLogWaste}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <h1 className="text-xl font-semibold text-red-800">{dict.tHours}</h1>

        <Card>
          <HoursEntry
            projects={projects.map((p) => ({ id: p.id, name: p.name, number: p.rentmanProjectNumber }))}
            ships={ships.map((s) => ({ id: s.id, name: s.name }))}
            fixedProject={user.useDefaultProject && user.defaultProject ? user.defaultProject : null}
            activeTimer={
              activeTimer
                ? {
                    startedAtIso: activeTimer.startedAt.toISOString(),
                    projectName: activeTimer.project.name,
                    shipName: activeTimer.ship?.name ?? null,
                  }
                : null
            }
            dict={dict}
          />
        </Card>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-slate-500">{dict.tHistory}</h2>
          {entries.length === 0 && <p className="text-sm text-slate-500">{dict.noEntries}</p>}
          {entries.map((entry) => (
            <Card key={entry.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {entry.project.name}
                  {entry.ship && <span className="text-slate-500"> · {entry.ship.name}</span>}
                </p>
                <p className="text-sm text-slate-500">
                  {entry.date.toISOString().slice(0, 10)} · {Number(entry.hours)} {dict.hours.toLowerCase()}
                  {entry.mode === "TIMER" ? " · ⏱️" : ""}
                </p>
                {entry.afasError && <p className="text-xs text-red-600">{entry.afasError}</p>}
              </div>
              <div className="flex items-center gap-2">
                <SyncStatusBadge status={entry.afasSyncStatus} />
                {entry.afasSyncStatus !== "SYNCED" && (
                  <form action={deleteTimeEntry.bind(null, entry.id)}>
                    <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
                      ✕
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
