// Exacte kleurtokens uit het door de klant aangeleverde referentiedashboard
// (rentman_dashboard_v4.html) -- bewust NIET de generieke
// components/admin/reports/palette.ts, omdat de klant een pixel-exacte match
// met dat voorbeeld wil. Alleen gebruikt binnen deze rentman-dashboard/-map.
export const dash = {
  bg: "#F0F2F5",
  ink: "#1F2937",
  heading: "#111827",
  muted: "#6B7280",
  mutedLight: "#9CA3AF",
  border: "#E5E7EB",
  blue: "#1E40AF",
  green: "#006B48",
  emerald: "#10B981",
  emeraldDark: "#065F46",
  emeraldSoft: "#F0FDF4",
  red: "#EF4444",
  redDark: "#B91C1C",
  redSoft: "#FEF2F2",
  amber: "#D97706",
  amberSoft: "#F59E0B",
  cyan: "#06B6D4",
  gray: "#6B7280",
  grayLight: "#9CA3AF",
  infoBg: "#EFF6FF",
  infoBorder: "#BFDBFE",
  infoText: "#1E3A5F",
  warnBg: "#FFFBEB",
  warnBorder: "#FCD34D",
  warnText: "#78350F",
};

/// Kleur per Rentman-status, gebruikt in donuts/gestapelde grafieken/
/// statuslijsten door het hele dashboard heen. Bevestigd/Klaargezet/Op
/// locatie/Schoonmaken & nakijken/Retour ophalen zijn de "actief
/// gefactureerd"-achtige statussen uit de reguliere projectsync (§10.2);
/// Optie/Aanvraag zijn nog niet bevestigd; Concept/Retour/Geannuleerd zijn
/// neutraal resp. afgesloten.
export const STATUS_COLORS: Record<string, string> = {
  Bevestigd: dash.emerald,
  Klaargezet: "#0D9488",
  "Op locatie": dash.cyan,
  "Schoonmaken & nakijken": "#14B8A6",
  "Retour ophalen": dash.gray,
  Optie: "#3B82F6",
  Aanvraag: dash.amberSoft,
  Concept: dash.grayLight,
  Retour: dash.gray,
  Geannuleerd: dash.red,
};

export function statusColor(status: string) {
  return STATUS_COLORS[status] ?? dash.grayLight;
}
