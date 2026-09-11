/** Compacte melding onder een grafiek voor punten die significant van de
 * lineaire trendlijn afwijken (zie lib/trend.ts) -- zelfde patroon
 * hergebruikt op alle rapportages met een forecast. `heading` is
 * aanpasbaar voor rapportages met een andere soort afwijking (bv. rooster
 * vs. werkelijk, geen trend maar een directe vergelijking). */
export function DeviationNote({
  items,
  unit,
  heading = "Wijkt af van de verwachte trend:",
  expectedLabel = "verwachte",
}: {
  items: { label: string; actual: number; expected: number }[];
  unit: string;
  heading?: string;
  expectedLabel?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-medium">{heading}</p>
      <ul className="mt-1 ml-4 list-disc">
        {items.slice(0, 8).map((item) => {
          const higher = item.actual > item.expected;
          return (
            <li key={item.label}>
              {item.label}: {item.actual} {unit} ({higher ? "boven" : "onder"} {expectedLabel} {item.expected} {unit})
            </li>
          );
        })}
      </ul>
      {items.length > 8 && <p className="mt-1 text-xs text-amber-700">... en {items.length - 8} meer.</p>}
    </div>
  );
}
