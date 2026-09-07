import Link from "next/link";
import { requireAdminScope } from "@/lib/dal";
import { NavBar } from "@/components/nav";
import { getDictionary } from "@/lib/i18n";

const tabs = [
  { href: "/traction", label: "Dashboard" },
  { href: "/traction/collegas", label: "Collega's" },
  { href: "/traction/instellingen", label: "Instellingen" },
];

/**
 * Taak/toewijzingsmodule (§10.9) -- eigen route buiten /admin, gated op
 * AdminScope.TRACTION (niet een apart rollensysteem, zie HANDOVER §10.9).
 * Zelfde chrome-stijl als app/admin/layout.tsx (sticky sectienav onder de
 * al-sticky NavBar-header), maar een eigen bestand omdat layouts in Next.js
 * op bestandslocatie werken, niet op URL-prefix.
 */
export default async function TractionLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminScope("TRACTION");

  return (
    <>
      <NavBar userName={user.name} isAdmin language="NL" dict={getDictionary("NL")} showEmployeeNav={false} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        <nav className="sticky top-14 z-10 flex gap-4 border-b border-slate-200 bg-white pt-1 text-sm">
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
