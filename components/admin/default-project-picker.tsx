"use client";

import { useState } from "react";
import { ProjectPicker, type ProjectPickerOption } from "@/components/project-picker";
import { getDictionary } from "@/lib/i18n";

const dict = getDictionary("NL");

/**
 * Client-wrapper om ProjectPicker (doorzoekbaar) te kunnen gebruiken voor
 * het "vast project"-veld in het beheerscherm -- dat scherm is een gewone
 * server-gerenderde form zonder eigen React-state, dus die state moet hier
 * lokaal gehouden worden.
 */
export function DefaultProjectPicker({
  projects,
  defaultProjectId,
}: {
  projects: ProjectPickerOption[];
  defaultProjectId: string;
}) {
  const [projectId, setProjectId] = useState(defaultProjectId);

  return (
    <ProjectPicker
      projects={projects}
      value={projectId}
      onChange={setProjectId}
      dict={dict}
      name="defaultProjectId"
      clearLabel="Geen vast project"
    />
  );
}
