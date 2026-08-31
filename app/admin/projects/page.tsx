import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { ProjectList } from "@/components/admin/project-list";

/** Projecten worden niet meer handmatig aangemaakt -- ze komen altijd uit
 * Rentman (/admin/rentman) of de Shiftbase-vaarbemanning-import
 * (/admin/shiftbase). Dit scherm is puur overzicht: (de)activeren en de
 * AFAS-projectcode instellen voor de urenexport. */
export default async function AdminProjectsPage() {
  await requireAdminScope("PROJECTS");
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      active: true,
      afasLink: { select: { afasProjectCode: true } },
      rentmanLink: { select: { rentmanSubprojectId: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <ProjectList
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          active: p.active,
          afasProjectCode: p.afasLink?.afasProjectCode ?? null,
          rentmanSubprojectId: p.rentmanLink?.rentmanSubprojectId ?? null,
        }))}
      />
    </div>
  );
}
