import { getSessionPayload } from "@/lib/session";
import { userHasAdminScope } from "@/lib/dal";
import { syncPendingTimeEntries } from "@/integrations/shiftbase/hoursSync";
import { isShiftbaseHoursExportEnabled } from "@/integrations/shiftbase/client";

export async function POST(request: Request) {
  const providedSecret = request.headers.get("x-sync-secret");
  const expectedSecret = process.env.SHIFTBASE_SYNC_SECRET;
  const secretIsValid = Boolean(expectedSecret) && providedSecret === expectedSecret;

  if (!secretIsValid) {
    const session = await getSessionPayload();
    if (!session?.userId) {
      return new Response(null, { status: 401 });
    }
    if (!(await userHasAdminScope(session.userId, "SHIFTBASE"))) {
      return new Response(null, { status: 403 });
    }
  }

  if (!isShiftbaseHoursExportEnabled()) {
    return Response.json(
      { error: "Urenexport staat uit (SHIFTBASE_HOURS_EXPORT_ENABLED is niet 'true')." },
      { status: 409 }
    );
  }

  const synced = await syncPendingTimeEntries();
  return Response.json({ processed: synced });
}
