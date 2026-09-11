import { redirect, forbidden } from "next/navigation";
import { getUser } from "@/lib/dal";
import { ADMIN_TABS, TRACTION_LINK, hasAnyScope } from "@/lib/admin-nav";

/**
 * Landingspunt voor de "Beheer"-link in de hoofdnavigatie
 * (components/nav.tsx) -- stuurt door naar het eerste tabblad waar de
 * ingelogde gebruiker daadwerkelijk toegang toe heeft. Die link wees
 * voorheen hardcoded naar `/admin/projects`, wat een scoped beheerder
 * zonder PROJECTS-scope (bv. iemand met alleen Rapportages/Rentman
 * dashboard) linea recht in een 403 liet lopen bij elke klik op "Beheer",
 * ongeacht welke andere onderdelen diegene wél mag zien (bevestigde bug,
 * 11 sep 2026). `app/admin/layout.tsx` heeft via `requireAnyAdminScope()`
 * al gegarandeerd dat de gebruiker hier komt met minstens één scope (of
 * volledig beheerder is) -- deze pagina hoeft dus alleen nog te kiezen
 * wélke van de toegankelijke tabs als eerste getoond wordt.
 */
export default async function AdminIndexPage() {
  const user = await getUser();

  if (user.role === "ADMIN") {
    redirect(ADMIN_TABS[0].href);
  }

  const firstTab = ADMIN_TABS.find((tab) => hasAnyScope(user.adminScopes, tab.scope));
  if (firstTab) {
    redirect(firstTab.href);
  }

  // Geen van de /admin/*-tabs toegankelijk -- als de gebruiker wél de
  // Traction-scope heeft (die buiten /admin/* leeft), stuur daar dan naar
  // toe i.p.v. een 403 te tonen op een verder lege /admin-pagina.
  if (hasAnyScope(user.adminScopes, TRACTION_LINK.scope)) {
    redirect(TRACTION_LINK.href);
  }

  // Zou niet moeten kunnen gebeuren (requireAnyAdminScope in de layout
  // garandeert al minstens één scope), maar een expliciete 403 hier is
  // duidelijker dan een lege pagina als die aanname ooit niet meer klopt.
  forbidden();
}
