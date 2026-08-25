// Donker-thema kleurtokens voor het Rentman financieel dashboard, overgenomen
// uit een door de klant aangeleverde stijlgids (instructie_dashboardstijl_
// vaartijden.md) -- alleen het VISUELE ontwerp is overgenomen, niet de
// Chart.js/single-file-bouwpatronen uit dat document (Vaartijd gebruikt
// Recharts + React-componenten, het gevestigde patroon in de rest van de
// app). Bewust een aparte, dashboard-specifieke tokenset -- niet de
// generieke components/admin/reports/palette.ts (die blijft licht, voor de
// rest van de admin-rapportages).
export const dash = {
  bg: "#0f1115",
  panel: "#171a21",
  panel2: "#1e222b",
  border: "#2a2f3a",
  text: "#e7e9ee",
  muted: "#9aa3b2",
  accent: "#5b8def",
  green: "#3ecf8e",
  orange: "#f5a623",
  red: "#ef5757",
  blue: "#5b8def",

  // Onderstaande zijn compatibiliteitsnamen zodat de bestaande tab-
  // componenten (die al met dash.* werken) grotendeels ongewijzigd blijven --
  // allemaal afgeleid van de 4 semantische kleuren hierboven (rood/oranje/
  // groen/blauw), zoals de stijlgids voorschrijft ("statuskleuren consistent
  // hergebruiken").
  heading: "#e7e9ee",
  mutedLight: "#6b7480",
  emerald: "#3ecf8e",
  emeraldDark: "#2fa876",
  emeraldSoft: "rgba(62,207,142,0.12)",
  red2: "#ef5757",
  redDark: "#e23c3c",
  redSoft: "rgba(239,87,87,0.12)",
  amber: "#f5a623",
  amberSoft: "#f5a623",
  cyan: "#5fb8d6",
  gray: "#9aa3b2",
  grayLight: "#6b7480",
  infoBg: "rgba(91,141,239,0.1)",
  infoBorder: "#5b8def",
  infoText: "#c7d6f9",
  warnBg: "rgba(245,166,35,0.1)",
  warnBorder: "#f5a623",
  warnText: "#f5c778",
};

/// Kleur per Rentman-status, allemaal afgeleid van de 4 basiskleuren
/// (blauw/groen/oranje/rood) in verschillende tinten, zodat elke status
/// zichtbaar onderscheidbaar blijft in gestapelde/donut-grafieken zonder
/// nieuwe, niet-verwante kleuren te introduceren. Onbekende/nieuwe
/// statuswaarden vallen terug op `mutedLight` (zie statusColor) -- ze
/// verdwijnen nooit stilzwijgend uit een grafiek.
export const STATUS_COLORS: Record<string, string> = {
  Bevestigd: "#3ecf8e",
  Klaargezet: "#2fa876",
  "Op locatie": "#5fb8d6",
  "Schoonmaken & nakijken": "#4a90c2",
  "Retour ophalen": "#7d8797",
  Optie: "#5b8def",
  Aanvraag: "#f5a623",
  Concept: "#6b7480",
  Retour: "#9aa3b2",
  Geannuleerd: "#ef5757",
};

export function statusColor(status: string) {
  return STATUS_COLORS[status] ?? dash.mutedLight;
}
