import { getSessionPayload } from "@/lib/session";
import { userHasAdminScopeWrite } from "@/lib/dal";
import { syncShiftbaseCrew } from "@/integrations/shiftbase/sync";
import { ShiftbaseApiError } from "@/integrations/shiftbase/client";

/// Dit is de tegenovergestelde richting van /api/shiftbase/sync (die stuurt
/// Vaartijd-uren NAAR Shiftbase, en staat nog geblokkeerd). Deze route haalt
/// vaarbemanning-uren UIT Shiftbase en legt ze vast in Vaartijd -- alleen
/// lezend richting Shiftbase.
async function isAuthorized(request: Request) {
  const expectedSecret = process.env.SHIFTBASE_IMPORT_SECRET;

  const authHeader = request.headers.get("authorization");
  if (expectedSecret && authHeader === `Bearer ${expectedSecret}`) return true;

  const providedSecret = request.headers.get("x-sync-secret");
  if (expectedSecret && providedSecret === expectedSecret) return true;

  const session = await getSessionPayload();
  if (!session?.userId) return false;
  return userHasAdminScopeWrite(session.userId, "SHIFTBASE");
}

async function handleImport(request: Request) {
  if (!(await isAuthorized(request))) {
    return new Response(null, { status: 401 });
  }

  try {
    const result = await syncShiftbaseCrew();
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof ShiftbaseApiError ? error.message : "Onbekende fout bij importeren vanuit Shiftbase.";
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return handleImport(request);
}

export async function POST(request: Request) {
  return handleImport(request);
}
