/**
 * Kleurtokens overgenomen uit het originele VBB Traction Organizer-bestand
 * (§10.9, 7-8 sep 2026) -- zelfde patroon als de donkere Rentman-dashboard-
 * tokenset (`components/admin/rentman-dashboard/colors.ts`): een losse,
 * schermspecifieke set i.p.v. de generieke lichte admin-Tailwind-kleuren.
 */
export const traction = {
  navyDeep: "#0A1F27",
  navy: "#123240",
  navyMid: "#1B4756",
  paper: "#E9EEE9",
  paperCard: "#F6F8F4",
  ink: "#132224",
  inkSoft: "#4B5D5C",
  brass: "#C08A3E",
  brassSoft: "#E4C793",
  line: "#D3DAD1",
  ok: "#2F6F4E",
  okBg: "#E3F0E7",
  warn: "#C8862B",
  warnBg: "#FBEDD9",
  stop: "#B5533C",
  stopBg: "#F6E3DE",
  none: "#8E9C97",
  noneBg: "#E8ECE6",
} as const;

/** Statuskleur voor een Rock-status (lege string = "geen status"). */
export function rockStatusColors(status: string): { fg: string; bg: string } {
  if (status === "Loopt") return { fg: traction.warn, bg: traction.warnBg };
  if (status === "Gereed") return { fg: traction.ok, bg: traction.okBg };
  if (status === "Niet meer van toepassing") return { fg: traction.stop, bg: traction.stopBg };
  return { fg: traction.none, bg: traction.noneBg };
}
