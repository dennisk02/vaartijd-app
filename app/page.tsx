import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { getActiveTimer } from "@/lib/timer";
import { getDailySummary } from "@/lib/daily-summary";
import { todayAtMidnight } from "@/lib/dates";
import { getDictionary, tFormat, localeFor } from "@/lib/i18n";
import { NavBar } from "@/components/nav";
import { Card } from "@/components/ui";
import { TimerWidget } from "@/components/timer-widget";

export default async function DashboardPage() {
  const user = await getUser();

  // Gebruikers met uitsluitend RENTMAN_FINANCIEEL-toegang (bv. Renko/Niels/
  // Henry, 27 aug 2026) hebben niets aan dit medewerker-thuisscherm -- stuur
  // ze direct door naar het dashboard zelf, zowel na inloggen (dit is de
  // eerste pagina na login/2FA) als bij elke latere navigatie naar "/".
  if (user.role !== "ADMIN" && user.adminScopes.length === 1 && user.adminScopes[0] === "RENTMAN_FINANCIEEL") {
    redirect("/admin/rentman-financieel");
  }

  const dict = getDictionary(user.language);
  const today = todayAtMidnight();

  const [summary, activeTimer] = await Promise.all([getDailySummary(user.id, today), getActiveTimer(user.id)]);

  const isSubmitted = Boolean(summary.submittedAt);

  const checklist = [
    {
      href: "/uren",
      icon: "⏱️",
      title: dict.tHours,
      done: summary.hasHours,
      chip: (
        <TimerWidget
          activeTimer={
            activeTimer
              ? {
                  startedAtIso: activeTimer.startedAt.toISOString(),
                  projectName: activeTimer.project.name,
                  shipName: activeTimer.ship?.name ?? null,
                }
              : null
          }
          projects={[]}
          ships={[]}
          dict={dict}
          variant="chip"
        />
      ),
    },
    user.canLogOccupancy && {
      href: "/scheepsbezetting",
      icon: "👥",
      title: dict.tOccupancy,
      done: summary.hasOccupancy,
      chip: null,
    },
    user.canLogMeals && { href: "/maaltijden", icon: "🍽️", title: dict.tMeals, done: summary.hasMeals, chip: null },
    user.canLogWaste && { href: "/afval", icon: "🗑️", title: dict.tWaste, done: summary.hasWaste, chip: null },
  ].filter((item): item is Exclude<typeof item, false> => Boolean(item));
  const doneCount = checklist.filter((item) => item.done).length;

  const dateLabel = new Intl.DateTimeFormat(localeFor(user.language), {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

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
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
        <div>
          <div className="text-sm text-slate-500">
            {dict.greeting}, {user.name.split(" ")[0]}
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">
            {dict.today} · <span className="text-red-700">{dateLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="rounded-2xl">
            <div className="text-xs text-slate-500">{dict.hours}</div>
            <div className="text-2xl font-extrabold text-slate-900">{summary.hours.toFixed(1)}</div>
          </Card>
          {user.canLogOccupancy && (
            <Card className="rounded-2xl">
              <div className="text-xs text-slate-500">{dict.tOccupancy}</div>
              <div className="text-2xl font-extrabold text-slate-900">
                {summary.occupancy}
                <span className="text-sm font-semibold text-slate-400"> {dict.onboardShort}</span>
              </div>
            </Card>
          )}
          {user.canLogMeals && (
            <Card className="rounded-2xl">
              <div className="text-xs text-slate-500">{dict.meals}</div>
              <div className="text-2xl font-extrabold text-slate-900">{summary.meals}</div>
            </Card>
          )}
          {user.canLogWaste && (
            <Card className="rounded-2xl">
              <div className="text-xs text-slate-500">{dict.waste}</div>
              <div className="text-2xl font-extrabold text-slate-900">
                {summary.waste.toFixed(1)}
                <span className="text-sm font-semibold text-slate-400"> {dict.kg}</span>
              </div>
            </Card>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{dict.logForToday}</p>
          <div className="flex flex-col gap-2">
            {checklist.map((item) => (
              <Card key={item.href} className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl">
                  {item.icon}
                </div>
                <Link href={item.href} className="flex-1">
                  <div className="text-sm font-bold text-slate-900">{item.title}</div>
                </Link>
                {item.chip ?? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      item.done ? "bg-red-50 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.done ? dict.done : dict.todo}
                  </span>
                )}
              </Card>
            ))}
          </div>
        </div>

        <div
          className={`flex items-center gap-3 rounded-2xl p-4 ${isSubmitted ? "bg-red-50" : "bg-red-700 text-white"}`}
        >
          <div className="flex-1">
            <div className={`text-sm font-extrabold ${isSubmitted ? "text-red-800" : "text-white"}`}>
              {isSubmitted ? dict.submitted : dict.notSubmittedYet}
            </div>
            {!isSubmitted && (
              <div className="text-xs text-red-100">
                {tFormat(dict.tasksDone, { done: doneCount, total: checklist.length })}
              </div>
            )}
          </div>
          {!isSubmitted && (
            <Link
              href="/dag-indienen"
              className="whitespace-nowrap rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-red-700"
            >
              {dict.review}
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
