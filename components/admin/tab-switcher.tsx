"use client";

import { useState, type ReactNode } from "react";

/** Lichte, generieke tab-switcher voor pagina's die meerdere eerder losse
 * admin-onderdelen samenvoegen (bv. Stamgegevens, Koppelingen) -- alle
 * tab-content wordt gerenderd, alleen de inactieve tabs worden visueel
 * verborgen (i.p.v. server-side conditioneel), dus geef alleen tabs mee
 * waar de gebruiker daadwerkelijk scope voor heeft. */
export function TabSwitcher({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 border-b border-slate-200 text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`-mb-px whitespace-nowrap border-b-2 pb-2 font-medium ${
              active === tab.id ? "border-red-700 text-red-800" : "border-transparent text-slate-500 hover:text-red-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} className={active === tab.id ? "flex flex-col gap-4" : "hidden"}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
