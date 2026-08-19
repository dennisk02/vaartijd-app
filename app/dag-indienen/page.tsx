import Link from "next/link";
import { getUser } from "@/lib/dal";
import { getDailySummary } from "@/lib/daily-summary";
import { todayAtMidnight } from "@/lib/dates";
import { getDictionary, localeFor } from "@/lib/i18n";
import { submitDay } from "@/lib/actions/day-submission";
import { NavBar } from "@/components/nav";
import { Card, Button } from "@/components/ui";

export default async function DagIndienenPage() {
  const user = await getUser();
  const dict = getDictionary(user.language);
  const today = todayAtMidnight();
  const todayStr = today.toISOString().slice(0, 10);

  const summary = await getDailySummary(user.id, today);
  const isSubmitted = Boolean(summary.submittedAt);

  const dateLabel = new Intl.DateTimeFormat(localeFor(user.language), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);

  const rows = [
    { icon: "⏱️", label: dict.tHours, value: `${summary.hours.toFixed(1)} ${dict.hours.toLowerCase()}`, href: "/uren" },
    user.canLogOccupancy && {
      icon: "👥",
      label: dict.tOccupancy,
      value: `${summary.occupancy} ${dict.onboardShort}`,
      href: "/scheepsbezetting",
    },
    user.canLogMeals && { icon: "🍽️", label: dict.tMeals, value: `${summary.meals}`, href: "/maaltijden" },
    user.canLogWaste && {
      icon: "🗑️",
      label: dict.tWaste,
      value: `${summary.waste.toFixed(1)} ${dict.kg}`,
      href: "/afval",
    },
  ].filter((row): row is { icon: string; label: string; value: string; href: string } => Boolean(row));

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
          <h1 className="text-xl font-semibold text-red-800">{dict.tSubmit}</h1>
          <p className="text-sm text-slate-500">
            {dict.summaryFor} · {dateLabel}
          </p>
        </div>

        <Card className="divide-y divide-slate-100 p-0">
          {rows.map((row) => (
            <div key={row.href} className="flex items-center gap-3 p-4">
              <span className="text-lg">{row.icon}</span>
              <span className="flex-1 text-sm font-semibold text-slate-600">{row.label}</span>
              <span className="text-sm font-extrabold text-slate-900">{row.value}</span>
              <Link href={row.href} className="text-sm font-bold text-red-700">
                {dict.edit}
              </Link>
            </div>
          ))}
        </Card>

        {isSubmitted ? (
          <Card className="border-red-200 bg-red-50 text-sm font-semibold text-red-800">
            {dict.alreadySubmitted}
          </Card>
        ) : (
          <>
            <Card className="flex items-start gap-3 bg-slate-50">
              <div className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-red-700 text-sm font-extrabold text-white">
                ✓
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{dict.confirmNote}</p>
            </Card>
            <form action={submitDay.bind(null, todayStr)}>
              <Button type="submit" className="w-full py-4 text-base">
                {dict.submitDay}
              </Button>
            </form>
          </>
        )}
      </main>
    </>
  );
}
