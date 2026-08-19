import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">403 - Geen toegang</h1>
      <p className="text-slate-500">Je hebt geen rechten om deze pagina te bekijken.</p>
      <Link href="/" className="text-red-700 hover:underline">
        Terug naar het dashboard
      </Link>
    </main>
  );
}
