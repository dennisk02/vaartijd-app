import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { setLanguage } from "@/lib/actions/language";
import type { AppLanguage, Dictionary } from "@/lib/i18n";

const navLinks: { href: string; labelKey: keyof Dictionary; feature?: "occupancy" | "meals" | "waste" }[] = [
  { href: "/", labelKey: "navHome" },
  { href: "/uren", labelKey: "navHours" },
  { href: "/scheepsbezetting", labelKey: "navOccupancy", feature: "occupancy" },
  { href: "/maaltijden", labelKey: "navMeals", feature: "meals" },
  { href: "/afval", labelKey: "navWaste", feature: "waste" },
  { href: "/geschiedenis", labelKey: "navHistory" },
];

const languageOptions: { code: AppLanguage; label: string }[] = [
  { code: "NL", label: "NL" },
  { code: "EN", label: "EN" },
  { code: "UK", label: "УКР" },
  { code: "AR", label: "عربي" },
];

export function NavBar({
  userName,
  isAdmin,
  language,
  dict,
  showEmployeeNav = true,
  canLogOccupancy = true,
  canLogMeals = true,
  canLogWaste = true,
}: {
  userName: string;
  /// Bepaalt of de "Beheer"-link zichtbaar is -- ondanks de naam dus niet
  /// strikt `role === "ADMIN"`: een scoped beheerder (`adminScopes.length >
  /// 0`, bv. iemand met alleen kijktoegang tot Rentman financieel) moet deze
  /// link ook zien, anders kan diegene helemaal niet bij `/admin/*` komen
  /// (bevestigde bug, 7 sep 2026 -- zie HANDOVER §10.9). Alle aanroepers
  /// geven dus `user.role === "ADMIN" || user.adminScopes.length > 0` door.
  /// De link zelf wijst naar `/admin` (niet meer hardcoded `/admin/projects`,
  /// wat een scoped beheerder zonder PROJECTS-scope linea recht in een 403
  /// liet lopen -- bevestigde bug, 11 sep 2026): `app/admin/page.tsx` stuurt
  /// vandaar door naar het eerste tabblad waar deze gebruiker daadwerkelijk
  /// toegang toe heeft.
  isAdmin: boolean;
  language: AppLanguage;
  dict: Dictionary;
  showEmployeeNav?: boolean;
  canLogOccupancy?: boolean;
  canLogMeals?: boolean;
  canLogWaste?: boolean;
}) {
  const featureEnabled: Record<"occupancy" | "meals" | "waste", boolean> = {
    occupancy: canLogOccupancy,
    meals: canLogMeals,
    waste: canLogWaste,
  };
  const visibleNavLinks = navLinks.filter((link) => !link.feature || featureEnabled[link.feature]);
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-red-800">
          {dict.appName}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">{userName}</span>
          {isAdmin && (
            <Link href="/admin" className="text-red-700 hover:underline">
              {dict.manage}
            </Link>
          )}
          <div className="flex overflow-hidden rounded-full border border-slate-200 text-xs font-bold">
            {languageOptions.map((option) => (
              <form key={option.code} action={setLanguage.bind(null, option.code)}>
                <button
                  type="submit"
                  className={`px-2 py-1 ${language === option.code ? "bg-red-700 text-white" : "text-slate-500"}`}
                >
                  {option.label}
                </button>
              </form>
            ))}
          </div>
          <form action={logout}>
            <button type="submit" className="text-slate-500 hover:text-slate-800">
              {dict.logout}
            </button>
          </form>
        </div>
      </div>
      {showEmployeeNav && (
        <nav className="mx-auto flex max-w-2xl gap-4 overflow-x-auto px-4 pb-2 text-xs font-semibold text-slate-500">
          {visibleNavLinks.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap hover:text-red-700">
              {dict[link.labelKey]}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
