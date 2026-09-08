import Link from "next/link";
import { requireAnyAdminScope } from "@/lib/dal";
import { NavBar } from "@/components/nav";
import { getDictionary } from "@/lib/i18n";
import type { AdminScope } from "@prisma/client";

/** `scope` mag ook een lijst zijn (bv. Stamgegevens/Koppelingen, die meerdere
 * eerder losse onderdelen samenvoegen, sep 2026) -- de tab is dan zichtbaar
 * zodra de gebruiker minstens één van die scopes heeft. Welke sub-tabbladen
 * er precies te zien zijn binnen zo'n samengevoegde pagina bepaalt de pagina
 * zelf (zie app/admin/stamgegevens en app/admin/koppelingen). */
const tabs: { href: string; label: string; scope: AdminScope | AdminScope[] }[] = [
  { href: "/admin/rapportages", label: "Rapportages", scope: "RAPPORTAGES" },
  { href: "/admin/voedselverspilling", label: "Voedselverspilling", scope: "RAPPORTAGES" },
  { href: "/admin/stamgegevens", label: "Stamgegevens", scope: ["PROJECTS", "SHIPS", "USERS"] },
  { href: "/admin/rentman-financieel", label: "Rentman dashboard", scope: "RENTMAN_FINANCIEEL" },
  { href: "/admin/koppelingen", label: "Koppelingen", scope: ["AFAS", "SHIFTBASE"] },
];

/// Traction (§10.9) leeft bewust buiten /admin (eigen URL-structuur,
/// /traction/*) -- hier alleen een link ernaartoe voor wie de scope heeft,
/// puur voor vindbaarheid vanuit het admin-menu.
const TRACTION_LINK = { href: "/traction", label: "Traction →", scope: "TRACTION" as AdminScope };

function hasAnyScope(userScopes: AdminScope[], required: AdminScope | AdminScope[]) {
  const list = Array.isArray(required) ? required : [required];
  return list.some((s) => userScopes.includes(s));
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAnyAdminScope();
  // Volledige beheerders zien alle tabs; scoped beheerders/medewerkers alleen
  // de onderdelen die ze toegewezen hebben gekregen (zie lib/dal.ts). Directe
  // navigatie naar een niet-toegewezen sectie wordt alsnog door de
  // pagina-eigen requireAdminScope()-guard geblokkeerd.
  const allTabs = [...tabs, TRACTION_LINK];
  const visibleTabs = user.role === "ADMIN" ? allTabs : allTabs.filter((tab) => hasAnyScope(user.adminScopes, tab.scope));

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
