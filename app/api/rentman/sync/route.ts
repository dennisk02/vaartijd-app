import { getSessionPayload } from "@/lib/session";
import { userHasAdminScopeWrite } from "@/lib/dal";
import { syncRentmanProjects } from "@/integrations/rentman/sync";
import { syncRentmanDashboard } from "@/integrations/rentman/dashboardSync";
import { syncRecentRentmanInvoices } from "@/integrations/rentman/invoiceExportSync";
import { RentmanApiError } from "@/integrations/rentman/client";

async function isAuthorized(request: Request) {
  const expectedSecret = process.env.RENTMAN_SYNC_SECRET;

  // Vercel Cron stuurt een GET-verzoek met deze header, mits CRON_SECRET is
  // ingesteld in de omgevingsvariabelen (zie vercel.json).
  const authHeader = request.headers.get("authorization");
  if (expectedSecret && authHeader === `Bearer ${expectedSecret}`) return true;

  const providedSecret = request.headers.get("x-sync-secret");
  if (expectedSecret && providedSecret === expectedSecret) return true;

  const session = await getSessionPayload();
  if (!session?.userId) return false;
  return userHasAdminScopeWrite(session.userId, "RENTMAN");
}

async function handleSync(request: Request) {
  if (!(await isAuthorized(request))) {
    return new Response(null, { status: 401 });
  }

  let projectResult: { processed: number; lastModified: string | null } | { error: string };
  try {
    const result = await syncRentmanProjects();
    projectResult = { processed: result.count, lastModified: result.lastModified };
  } catch (error) {
    const message = error instanceof RentmanApiError ? error.message : "Onbekende fout bij Rentman-sync.";
    projectResult = { error: message };
  }

  // Los geprobeerd (en los gerapporteerd) van de projectsync hierboven --
  // een fout in de dashboardberekening mag de (belangrijkere) projectsync
  // niet laten falen, en andersom.
  let dashboardResult: Record<string, unknown> | { error: string };
  try {
    dashboardResult = await syncRentmanDashboard();
  } catch (error) {
    const message = error instanceof RentmanApiError ? error.message : "Onbekende fout bij Rentman-dashboardsync.";
    dashboardResult = { error: message };
  }

  // Ook los geprobeerd/gerapporteerd: het verkoopfacturen-overzicht voor de
  // Rentman -> AFAS-pagina (§10.8) -- een fout hier mag de andere twee syncs
  // niet raken, en andersom.
  let invoiceExportResult: { invoiceCount: number } | { error: string };
  try {
    invoiceExportResult = await syncRecentRentmanInvoices();
  } catch (error) {
    const message = error instanceof RentmanApiError ? error.message : "Onbekende fout bij ophalen van facturen.";
    invoiceExportResult = { error: message };
  }

  return Response.json({ project: projectResult, dashboard: dashboardResult, invoiceExport: invoiceExportResult });
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
