import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminScope } from "@/lib/dal";
import { Card, Button } from "@/components/ui";
import { UserForm } from "@/components/admin/user-form";
import { toggleUserActive } from "@/lib/actions/admin";

const roleLabels: Record<string, string> = { EMPLOYEE: "Medewerker", ADMIN: "Beheerder" };

/** Zit ook, ongewijzigd, als tabblad in /admin/stamgegevens (sep 2026,
 * samengevoegde navigatie) -- deze route blijft ook los bereikbaar. */
export async function UsersPageContent() {
  const currentUser = await requireAdminScope("USERS");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { afasLink: { select: { afasEmployeeNumber: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      {currentUser.role === "ADMIN" && (
        <Card>
          <UserForm />
        </Card>
      )}
      <div className="flex flex-col gap-3">
        {users.map((user) => (
          <Card key={user.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {user.name} <span className="text-slate-400">· {roleLabels[user.role]}</span>
              </p>
              <p className="text-sm text-slate-500">{user.email}</p>
              {user.afasLink?.afasEmployeeNumber && (
                <p className="text-xs text-slate-400">AFAS-nummer: {user.afasLink.afasEmployeeNumber}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/users/${user.id}`} className="text-xs text-red-700 hover:underline">
                Toewijzingen
              </Link>
              <form action={toggleUserActive.bind(null, user.id, !user.active)}>
                <Button type="submit" variant={user.active ? "secondary" : "primary"} className="text-xs">
                  {user.active ? "Deactiveren" : "Activeren"}
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function AdminUsersPage() {
  return <UsersPageContent />;
}
