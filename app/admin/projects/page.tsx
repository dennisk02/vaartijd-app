import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { Card } from "@/components/ui";
import { ProjectForm } from "@/components/admin/project-form";
import { ProjectList } from "@/components/admin/project-list";

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
      <Card>
        <ProjectForm />
      </Card>
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
