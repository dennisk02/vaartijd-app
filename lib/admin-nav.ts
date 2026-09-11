import type { AdminScope } from "@prisma/client";

/** `scope` mag ook een lijst zijn (bv. Stamgegevens/Koppelingen, die meerdere
 * eerder losse onderdelen samenvoegen, sep 2026) -- de tab is dan zichtbaar
 * zodra de gebruiker minstens één van die scopes heeft. Welke sub-tabbladen
 * er precies te zien zijn binnen zo'n samengevoegde pagina bepaalt de pagina
 * zelf (zie app/admin/stamgegevens en app/admin/koppelingen).
 *
 * Gedeeld tussen app/admin/layout.tsx (de tabbalk) en app/admin/page.tsx
 * (het "Beheer"-landingspunt, dat naar de eerste toegankelijke tab
 * doorstuurt) -- was voorheen alleen lokaal in layout.tsx gedefinieerd, wat
 * `/admin/page.tsx` dwong een eigen, makkelijk uit de pas lopende kopie bij
 * te houden. */
export type AdminTab = { href: string; label: string; scope: AdminScope | AdminScope[] };

export const ADMIN_TABS: AdminTab[] = [
  { href: "/admin/rapportages", label: "Rapportages", scope: "RAPPORTAGES" },
  { href: "/admin/voedselverspilling", label: "Voedselverspilling", scope: "RAPPORTAGES" },
  { href: "/admin/stamgegevens", label: "Stamgegevens", scope: ["PROJECTS", "SHIPS", "USERS"] },
  { href: "/admin/rentman-financieel", label: "Rentman dashboard", scope: "RENTMAN_FINANCIEEL" },
  { href: "/admin/koppelingen", label: "Koppelingen", scope: ["AFAS", "SHIFTBASE"] },
];

/// Traction (§10.9) leeft bewust buiten /admin (eigen URL-structuur,
/// /traction/*) -- hier alleen een link ernaartoe voor wie de scope heeft,
/// puur voor vindbaarheid vanuit het admin-menu.
export const TRACTION_LINK: AdminTab = { href: "/traction", label: "Traction →", scope: "TRACTION" };

export function hasAnyScope(userScopes: AdminScope[], required: AdminScope | AdminScope[]) {
  const list = Array.isArray(required) ? required : [required];
  return list.some((s) => userScopes.includes(s));
}

/** Volledige beheerders zien alle tabs; scoped beheerders/medewerkers alleen
 * de onderdelen die ze toegewezen hebben gekregen. Directe navigatie naar
 * een niet-toegewezen sectie wordt alsnog door de pagina-eigen
 * requireAdminScope()-guard geblokkeerd. */
export function visibleAdminTabs(role: string, userScopes: AdminScope[]): AdminTab[] {
  const allTabs = [...ADMIN_TABS, TRACTION_LINK];
  return role === "ADMIN" ? allTabs : allTabs.filter((tab) => hasAnyScope(userScopes, tab.scope));
}
