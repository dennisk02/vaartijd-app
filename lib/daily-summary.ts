import "server-only";
import { prisma } from "@/lib/prisma";

type DaySummary = ReturnType<typeof summarize>;

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function summarize(
  timeEntries: { hours: unknown }[],
  occupancy: { passengerCount: number; crewCount: number }[],
  meals: { countServed: number }[],
  waste: { kg: unknown }[],
  submittedAt: Date | null
) {
  return {
    timeEntries,
    hours: timeEntries.reduce((sum, e) => sum + Number(e.hours), 0),
    occupancy: occupancy.reduce((sum, o) => sum + o.passengerCount + o.crewCount, 0),
    meals: meals.reduce((sum, m) => sum + m.countServed, 0),
    waste: waste.reduce((sum, w) => sum + Number(w.kg), 0),
    hasHours: timeEntries.length > 0,
    hasOccupancy: occupancy.length > 0,
    hasMeals: meals.length > 0,
    hasWaste: waste.length > 0,
    submittedAt,
  };
}

export async function getDailySummary(userId: string, date: Date) {
  const [timeEntries, occupancy, meals, waste, daySubmission] = await Promise.all([
    prisma.timeEntry.findMany({ where: { userId, date }, include: { project: true, ship: true } }),
    prisma.shipOccupancy.findMany({ where: { createdById: userId, date } }),
    prisma.mealCount.findMany({ where: { createdById: userId, date } }),
    prisma.foodWaste.findMany({ where: { createdById: userId, date } }),
    prisma.daySubmission.findUnique({ where: { userId_date: { userId, date } } }),
  ]);

  return summarize(timeEntries, occupancy, meals, waste, daySubmission?.submittedAt ?? null);
}

/**
 * Zelfde resultaat als `getDailySummary` voor elke dag in `days`, maar met
 * 5 query's in totaal in plaats van 5 per dag -- voorkomt dat bv. de
 * maandweergave in Geschiedenis 30x5 = 150 gelijktijdige database-aanroepen
 * doet. `days` hoeft niet aaneengesloten te zijn; het bereik wordt uit de
 * min/max datum afgeleid.
 */
export async function getDailySummariesInRange(userId: string, days: Date[]): Promise<Map<string, DaySummary>> {
  if (days.length === 0) return new Map();

  const times = days.map((d) => d.getTime());
  const rangeStart = new Date(Math.min(...times));
  const rangeEnd = new Date(Math.max(...times));
  const dateFilter = { gte: rangeStart, lte: rangeEnd };

  const [timeEntries, occupancy, meals, waste, daySubmissions] = await Promise.all([
    prisma.timeEntry.findMany({ where: { userId, date: dateFilter }, include: { project: true, ship: true } }),
    prisma.shipOccupancy.findMany({ where: { createdById: userId, date: dateFilter } }),
    prisma.mealCount.findMany({ where: { createdById: userId, date: dateFilter } }),
    prisma.foodWaste.findMany({ where: { createdById: userId, date: dateFilter } }),
    prisma.daySubmission.findMany({ where: { userId, date: dateFilter } }),
  ]);

  const byDate = <T extends { date: Date }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const key = dateKey(row.date);
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    }
    return map;
  };

  const timeEntriesByDate = byDate(timeEntries);
  const occupancyByDate = byDate(occupancy);
  const mealsByDate = byDate(meals);
  const wasteByDate = byDate(waste);
  const submittedAtByDate = new Map(daySubmissions.map((s) => [dateKey(s.date), s.submittedAt]));

  const result = new Map<string, DaySummary>();
  for (const day of days) {
    const key = dateKey(day);
    result.set(
      key,
      summarize(
        timeEntriesByDate.get(key) ?? [],
        occupancyByDate.get(key) ?? [],
        mealsByDate.get(key) ?? [],
        wasteByDate.get(key) ?? [],
        submittedAtByDate.get(key) ?? null
      )
    );
  }
  return result;
}
