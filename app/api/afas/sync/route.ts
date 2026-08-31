import { getSessionPayload } from "@/lib/session";
import { userHasAdminScope } from "@/lib/dal";
import { syncPendingTimeEntries } from "@/integrations/afas/hoursSync";

export async function POST(request: Request) {
  const providedSecret = request.headers.get("x-sync-secret");
  const expectedSecret = process.env.AFAS_SYNC_SECRET;
  const secretIsValid = Boolean(expectedSecret) && providedSecret === expectedSecret;

  if (!secretIsValid) {
    const session = await getSessionPayload();
    if (!session?.userId) {
      return new Response(null, { status: 401 });
    }
    if (!(await userHasAdminScope(session.userId, "AFAS"))) {
      return new Response(null, { status: 403 });
    }
  }

  const synced = await syncPendingTimeEntries();
  return Response.json({ processed: synced });
}
