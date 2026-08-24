"use client";

import { useState, type ReactNode } from "react";

export function RentmanDashboardTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              active === tab.id ? "bg-white text-red-700 shadow-sm" : "text-slate-500"
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
