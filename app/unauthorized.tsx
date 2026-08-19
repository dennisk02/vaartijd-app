import Link from "next/link";

export default function Unauthorized() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">401 - Niet ingelogd</h1>
      <p className="text-slate-500">Log in om deze pagina te bekijken.</p>
      <Link href="/login" className="text-red-700 hover:underline">
        Naar inloggen
      </Link>
    </main>
  );
}
