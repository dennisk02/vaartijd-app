"use client";

import { useMemo, useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { toggleProjectActive, updateProjectAfasCode } from "@/lib/actions/admin";

type ProjectRow = {
  id: string;
  name: string;
  active: boolean;
  afasProjectCode: string | null;
  rentmanSubprojectId: string | null;
};

/** AFAS-projectcode is los bewerkbaar per project (§10.6) -- er is geen
 * aanmaakformulier meer, dus dit is de enige plek om 'm in te stellen. */
function AfasCodeField({ projectId, initialValue }: { projectId: string; initialValue: string | null }) {
  const [value, setValue] = useState(initialValue ?? "");

  return (
    <form
      action={() => updateProjectAfasCode(projectId, value)}
      className="flex items-center gap-1.5"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="AFAS-code"
        className="h-7 w-28 px-2 py-1 text-xs"
      />
      <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
        Bewaar
      </Button>
    </form>
  );
}

/**
 * Doorzoekbare projectenlijst voor het beheerscherm -- zonder zoekveld werd
 * dit onbruikbaar zodra Rentman-syncs weer honderden (tot ~1300) projecten
 * aanleveren; met een zoekveld blijft alleen de gefilterde subset in de DOM
 * gerenderd. Projecten komen altijd via Rentman of Shiftbase binnen -- geen
 * aanmaakformulier meer, alleen (de)activeren en de AFAS-code instellen.
 */
export function ProjectList({ projects }: { projects: ProjectRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(q) ||
        (project.afasProjectCode ?? "").toLowerCase().includes(q)
    );
  }, [projects, query]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Zoek op naam of AFAS-code..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
      />
      <p className="text-xs text-slate-400">
        {filtered.length} van {projects.length} projecten
      </p>
      {filtered.length === 0 && <p className="text-sm text-slate-500">Geen projecten gevonden.</p>}
      {filtered.map((project) => (
        <Card key={project.id} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">
              {project.name}
              {project.rentmanSubprojectId && (
                <span className="ml-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                  Rentman
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <AfasCodeField projectId={project.id} initialValue={project.afasProjectCode} />
            <form action={toggleProjectActive.bind(null, project.id, !project.active)}>
              <Button type="submit" variant={project.active ? "secondary" : "primary"} className="text-xs">
                {project.active ? "Deactiveren" : "Activeren"}
              </Button>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}
