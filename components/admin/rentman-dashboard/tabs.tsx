"use client";

import { useState, type ReactNode } from "react";
import { dash } from "./colors";

export function RentmanDashboardTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-0 overflow-x-auto border-b-2" style={{ borderColor: dash.border }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className="-mb-0.5 whitespace-nowrap px-4 py-2.5 text-[13px] font-semibold"
            style={
              active === tab.id
                ? { color: dash.blue, borderBottom: `2px solid ${dash.blue}` }
                : { color: dash.muted, borderBottom: "2px solid transparent" }
            }
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
