import Link from "next/link";
import { requireAnyAdminScope } from "@/lib/dal";
import { NavBar } from "@/components/nav";
import { getDictionary } from "@/lib/i18n";
import { visibleAdminTabs } from "@/lib/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyAdminScope();
  const visibleTabs = visibleAdminTabs(user.role, user.adminScopes);

  return (
    <>
      <NavBar userName={user.name} isAdmin language="NL" dict={getDictionary("NL")} showEmployeeNav={false} />
      {/* max-w-6xl i.p.v. de vorige max-w-2xl -- met alle tabbladen (t/m
          Traction) paste de tab-balk niet meer in 672px en liep zonder wrap
          gewoon over de kaarten eronder heen. overflow-x-auto op de nav is
          een vangnet voor als er ooit nóg een tabblad bijkomt: dan scrollt
          de balk netjes i.p.v. weer over de rand te lopen. */}
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <nav className="sticky top-14 z-10 flex gap-4 overflow-x-auto border-b border-slate-200 bg-white pt-1 text-sm">
          {visibleTabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className="whitespace-nowrap pb-2 text-slate-600 hover:text-red-800">
              {tab.label}
            </Link>
          ))}
        </nav>
        {children}
      </main>
    </>
  );
}
