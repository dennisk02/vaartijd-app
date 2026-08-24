export function formatEuro(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    value
  );
}

export function formatMonthLabel(month: string) {
  const [year, m] = month.split("-");
  const names = [
    "Jan",
    "Feb",
    "Mrt",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dec",
  ];
  const index = Number(m) - 1;
  return `${names[index] ?? m} ${year}`;
}
