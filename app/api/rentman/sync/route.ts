import { getSessionPayload } from "@/lib/session";
import { syncRentmanProjects } from "@/lib/rentman/sync";
import { RentmanApiError } from "@/lib/rentman/client";

async function isAuthorized(request: Request) {
  const expectedSecret = process.env.RENTMAN_SYNC_SECRET;

  // Vercel Cron stuurt een GET-verzoek met deze header, mits CRON_SECRET is
  // ingesteld in de omgevingsvariabelen (zie vercel.json).
  const authHeader = request.headers.get("authorization");
  if (expectedSecret && authHeader === `Bearer ${expectedSecret}`) return true;

  const providedSecret = request.headers.get("x-sync-secret");
  if (expectedSecret && providedSecret === expectedSecret) return true;

  const session = await getSessionPayload();
  return session?.role === "ADMIN";
}

async function handleSync(request: Request) {
  if (!(await isAuthorized(request))) {
    return new Response(null, { status: 401 });
  }

  try {
    const result = await syncRentmanProjects();
    return Response.json({ processed: result.count, lastModified: result.lastModified });
  } catch (error) {
    const message = error instanceof RentmanApiError ? error.message : "Onbekende fout bij Rentman-sync.";
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
