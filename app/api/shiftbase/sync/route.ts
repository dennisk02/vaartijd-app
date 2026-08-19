import { getSessionPayload } from "@/lib/session";
import { syncPendingTimeEntries } from "@/lib/shiftbase/hoursSync";

export async function POST(request: Request) {
  const providedSecret = request.headers.get("x-sync-secret");
  const expectedSecret = process.env.SHIFTBASE_SYNC_SECRET;
  const secretIsValid = Boolean(expectedSecret) && providedSecret === expectedSecret;

  if (!secretIsValid) {
    const session = await getSessionPayload();
    if (!session?.userId) {
      return new Response(null, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return new Response(null, { status: 403 });
    }
  }

  const synced = await syncPendingTimeEntries();
  return Response.json({ processed: synced });
}
