import Link from "next/link";
import { getUser } from "@/lib/dal";
import { getDailySummariesInRange } from "@/lib/daily-summary";
import { todayAtMidnight } from "@/lib/dates";
import { getDictionary, localeFor } from "@/lib/i18n";
import { NavBar } from "@/components/nav";
import { Card } from "@/components/ui";

async function getDaysInRange(userId: string, rangeDays: number) {
  const days: Date[] = [];
  for (let i = 0; i < rangeDays; i++) {
    const date = todayAtMidnight();
    date.setUTCDate(date.getUTCDate() - i);
    days.push(date);
  }
  const summaries = await getDailySummariesInRange(userId, days);
  return days.map((date) => ({ date, summary: summaries.get(date.toISOString().slice(0, 10))! }));
}

export default async function GeschiedenisPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isMonth = view === "month";
  const user = await getUser();
  const dict = getDictionary(user.language);
  const locale = localeFor(user.language);

  const days = await getDaysInRange(user.id, isMonth ? 30 : 7);
  const weekTotalHours = days.reduce((sum, d) => sum + d.summary.hours, 0);

  return (
    <>
      <NavBar
        userName={user.name}
        isAdmin={user.role === "ADMIN" || user.adminScopes.length > 0}
        language={user.language}
        dict={dict}
        canLogOccupancy={user.canLogOccupancy}
        canLogMeals={user.canLogMeals}
        canLogWaste={user.canLogWaste}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
        <h1 className="text-xl font-semibold text-red-800">{dict.tHistory}</h1>

        <div className="inline-flex w-fit gap-1 rounded-2xl border border-slate-200 bg-white p-1">
          <Link
            href="/geschiedenis"
            className={`rounded-xl px-3.5 py-2 text-sm font-bold ${
              !isMonth ? "bg-red-700 text-white" : "text-slate-600"
            }`}
          >
            {dict.week}
          </Link>
          <Link
            href="/geschiedenis?view=month"
            className={`rounded-xl px-3.5 py-2 text-sm font-bold ${
              isMonth ? "bg-red-700 text-white" : "text-slate-600"
            }`}
          >
            {dict.month}
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          {days.map(({ date, summary }) => {
            const hasAnyEntry = summary.hasHours || summary.hasOccupancy || summary.hasMeals || summary.hasWaste;
            const dayNumber = new Intl.DateTimeFormat(locale, { day: "numeric" }).format(date);
            const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
            const isSubmitted = Boolean(summary.submittedAt);

            return (
              <Card key={date.toISOString()} className="flex items-center gap-3">
                <div className="w-9 flex-none text-center">
                  <div className="text-lg font-extrabold text-slate-900">{dayNumber}</div>
                  <div className="text-[10px] uppercase text-slate-400">{weekday}</div>
                </div>
                <div className="flex-1">
                  {hasAnyEntry ? (
                    <>
                      <div className="text-sm font-bold text-slate-900">
                        {summary.hours.toFixed(1)} {dict.hours.toLowerCase()}
                        {user.canLogOccupancy && ` · ${summary.occupancy} ${dict.onboardShort}`}
                      </div>
                      {(user.canLogWaste || user.canLogMeals) && (
                        <div className="text-xs text-slate-500">
                          {user.canLogWaste && `${summary.waste.toFixed(1)} ${dict.kg}`}
                          {user.canLogWaste && user.canLogMeals && " · "}
                          {user.canLogMeals && `${summary.meals} ${dict.meals.toLowerCase()}`}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-slate-400">{dict.noEntries}</div>
                  )}
                </div>
                {hasAnyEntry && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      isSubmitted ? "bg-red-50 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isSubmitted ? dict.submitted : dict.open}
                  </span>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="flex items-center justify-between bg-slate-50">
          <span className="text-sm font-bold text-slate-600">{dict.weekTotal}</span>
          <span className="text-base font-extrabold text-slate-900">
            {weekTotalHours.toFixed(1)} {dict.hours.toLowerCase()}
          </span>
        </Card>
      </main>
    </>
  );
}
