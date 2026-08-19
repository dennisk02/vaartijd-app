import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { NavBar } from "@/components/nav";
import { getDictionary } from "@/lib/i18n";

const tabs = [
  { href: "/admin/rapportages", label: "Rapportages" },
  { href: "/admin/projects", label: "Projecten" },
  { href: "/admin/ships", label: "Schepen" },
  { href: "/admin/users", label: "Medewerkers" },
  { href: "/admin/rentman", label: "Rentman" },
  { href: "/admin/afas", label: "AFAS-koppeling" },
  { href: "/admin/shiftbase", label: "Shiftbase" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <>
      <NavBar userName={user.name} isAdmin language="NL" dict={getDictionary("NL")} showEmployeeNav={false} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <nav className="flex gap-4 border-b border-slate-200 text-sm">
          {tabs.map((tab) => (
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
