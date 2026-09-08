"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { traction } from "./colors";

const TABS = [
  { href: "/traction", label: "Overzicht" },
  { href: "/traction/taken", label: "Taken" },
  { href: "/traction/doelen", label: "Doelen" },
  { href: "/traction/collegas", label: "Collega's" },
  { href: "/traction/instellingen", label: "Instellingen" },
];

/** Tabbalk in de stijl van het origineel (actieve tab lichter, met een
 * koperkleurige onderrand) -- behoudt het huidige jaar (`?jaar=`) bij het
 * wisselen van tabblad. */
export function TractionTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("jaar") ? `?jaar=${searchParams.get("jaar")}` : "";

  return (
    <div className="mx-auto flex max-w-[1180px] gap-1 px-7 pt-3.5">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={`${tab.href}${query}`}
            className="relative top-px rounded-t-lg px-4 py-2.5 font-serif text-sm font-semibold"
            style={
              active
                ? { background: traction.paperCard, color: traction.navyDeep, boxShadow: `0 -2px 0 ${traction.brass} inset` }
                : { color: traction.inkSoft }
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
