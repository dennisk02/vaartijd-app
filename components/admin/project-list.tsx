"use client";

import { useMemo, useState } from "react";
import { Card, Button } from "@/components/ui";
import { toggleProjectActive } from "@/lib/actions/admin";

type ProjectRow = {
  id: string;
  name: string;
  active: boolean;
  afasProjectCode: string | null;
  rentmanSubprojectId: string | null;
};

/**
 * Doorzoekbare projectenlijst voor het beheerscherm -- zonder zoekveld werd
 * dit onbruikbaar zodra Rentman-syncs weer honderden (tot ~1300) projecten
 * aanleveren; met een zoekveld blijft alleen de gefilterde subset in de DOM
 * gerenderd.
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
        <Card key={project.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {project.name}
              {project.rentmanSubprojectId && (
                <span className="ml-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                  Rentman
                </span>
              )}
            </p>
            {project.afasProjectCode && (
              <p className="text-sm text-slate-500">AFAS-code: {project.afasProjectCode}</p>
            )}
          </div>
          <form action={toggleProjectActive.bind(null, project.id, !project.active)}>
            <Button type="submit" variant={project.active ? "secondary" : "primary"} className="text-xs">
              {project.active ? "Deactiveren" : "Activeren"}
            </Button>
          </form>
        </Card>
      ))}
    </div>
  );
}
