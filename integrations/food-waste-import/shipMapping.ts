import "server-only";

/**
 * Koppeling tussen de locatienamen in River Roots' eigen Food Waste
 * Dashboard (Victor Mshati, sep 2026 -- kolom "Location / Vessel" in het
 * "Raw Data"-tabblad) en de daadwerkelijke Ship-namen in Vaartijd.
 *
 * Bewust een expliciete, handmatig bevestigde 1-op-1-lijst i.p.v. fuzzy/
 * substring-matching: "HIA1"/"HIA2" en "Arnhem 1"/"Arnhem 2" verschillen
 * maar één teken, en Victor's eigen e-mail (7 sep 2026) waarschuwt juist
 * voor precies dit soort naamverwarring ("Rotterdam" is zowel een locatie
 * als de naam van het schip dat in Urk ligt). Fout toewijzen aan het
 * verkeerde schip is erger dan een rij overslaan, dus geen giswerk.
 *
 * Matcht op exacte Ship.name (getrimd) -- geen ship-ID's, zodat dit blijft
 * werken ook als schepen ooit opnieuw aangemaakt worden.
 */
export const LOCATION_TO_SHIP_NAME: Record<string, string> = {
  "Maassluis (MS Patria)": "Moods & Roots VIII (Maassluis)",
  "HIA2 (MPS Le Formidable)": "Moods & Roots XI (HIA II)",
  "Arnhem 1 (Amanpuri)": "Moods&Roots Arnhem",
  Schiedam: "Moods&Roots II (Schiedam)",
  "Rotterdam (MS Allegro)": "Moods&Roots VI (Rotterdam)",
  "HIA1 (Rossini & Royal Crown)": "Moods & Roots IX (HIA)",
  "Krimpen (MS Danubia)": "Moods&Roots I (Krimpen)",
  "Arnhem 2": "Moods & Roots Arnhem II",
  "Hellevoetsluis (MS Alicia)": "Moods&Roots III (Hellevoetsluis)",
  Urk: "Moods and Roots X (Urk)",
  "Meppel (MS Triton)": "Moods&Roots XIII (Meppel)",
};

/** Onbekende/niet-gemapte locatienamen worden overgeslagen, niet geraden. */
export function shipNameForLocation(location: string): string | null {
  return LOCATION_TO_SHIP_NAME[location.trim()] ?? null;
}
