"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { addYear } from "@/lib/actions/traction";
import { traction } from "./colors";

/** Jaarkiezer + "jaar toevoegen"-knop, zichtbaar op elke Traction-pagina.
 * Het gekozen jaar staat in de querystring (`?jaar=2026`) zodat elke pagina
 * (Overzicht/Taken/Doelen) 'm onafhankelijk kan lezen zonder een aparte
 * route per jaar te hoeven maken. */
export function YearSelector({ years, currentYear }: { years: number[]; currentYear: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // De layout (waar deze component in staat) krijgt geen `searchParams` van
  // Next.js door -- die leest hier dus zelf de querystring, met het
  // server-berekende `currentYear` alleen als terugvaloptie wanneer er nog
  // geen `?jaar=` in de URL staat.
  const selectedYear = Number(searchParams.get("jaar")) || currentYear;

  function goToYear(year: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("jaar", String(year));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedYear}
        onChange={(e) => goToYear(Number(e.target.value))}
        className="rounded-full px-3 py-1.5 text-sm font-semibold"
        style={{ background: traction.navyDeep, color: traction.brassSoft, border: `1px solid ${traction.brass}` }}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await addYear();
            if (result?.year) goToYear(result.year);
          })
        }
        className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold"
        style={{ borderColor: traction.brass, color: traction.brassSoft }}
      >
        {pending ? "Bezig..." : "+ Jaar"}
      </button>
    </div>
  );
}
