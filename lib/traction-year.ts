/** Standaardjaar als er geen `?jaar=`-querystring is: het huidige kalenderjaar
 * als dat bestaat, anders het meest recente jaar -- zelfde regel als het
 * origineel (`state.years.includes(realYear) ? realYear : ...`). `years`
 * moet oplopend gesorteerd zijn. */
export function defaultTractionYear(years: number[]): number {
  const realYear = new Date().getFullYear();
  if (years.includes(realYear)) return realYear;
  return years.length > 0 ? years[years.length - 1] : realYear;
}
