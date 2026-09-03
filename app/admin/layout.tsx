import Link from "next/link";
import { requireAnyAdminScope } from "@/lib/dal";
import { NavBar } from "@/components/nav";
import { getDictionary } from "@/lib/i18n";
import type { AdminScope } from "@prisma/client";

const tabs: { href: string; label: string; scope: AdminScope }[] = [
  { href: "/admin/rapportages", label: "Rapportages", scope: "RAPPORTAGES" },
  { href: "/admin/projects", label: "Projecten", scope: "PROJECTS" },
  { href: "/admin/ships", label: "Schepen", scope: "SHIPS" },
  { href: "/admin/users", label: "Medewerkers", scope: "USERS" },
  { href: "/admin/rentman", label: "Rentman", scope: "RENTMAN" },
  { href: "/admin/rentman-financieel", label: "Rentman financieel", scope: "RENTMAN_FINANCIEEL" },
  { href: "/admin/rentman-afas", label: "Rentman → AFAS", scope: "AFAS" },
  { href: "/admin/afas", label: "AFAS-koppeling", scope: "AFAS" },
  { href: "/admin/shiftbase", label: "Shiftbase", scope: "SHIFTBASE" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyAdminScope();
  // Volledige beheerders zien alle tabs; scoped beheerders/medewerkers alleen
  // de onderdelen die ze toegewezen hebben gekregen (zie lib/dal.ts). Directe
  // navigatie naar een niet-toegewezen sectie wordt alsnog door de
  // pagina-eigen requireAdminScope()-guard geblokkeerd.
  const visibleTabs = user.role === "ADMIN" ? tabs : tabs.filter((tab) => user.adminScopes.includes(tab.scope));

  return (
    <>
      <NavBar userName={user.name} isAdmin language="NL" dict={getDictionary("NL")} showEmployeeNav={false} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <nav className="sticky top-14 z-10 flex gap-4 border-b border-slate-200 bg-white pt-1 text-sm">
          {visibleTabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className="pb-2 text-slate-600 hover:text-red-800">
              {tab.label}
            </Link>
          ))}
        </nav>
        {children}
      </main>
    </>
  );
}
