"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScopeWrite } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const PAGE_PATH = "/traction";
const COLLEAGUES_PATH = "/traction/collegas";
const SETTINGS_PATH = "/traction/instellingen";

// ---------------------------------------------------------------------------
// Collega's
// ---------------------------------------------------------------------------

export type TractionFormState = { error?: string; message?: string } | undefined;

export async function createColleague(_state: TractionFormState, formData: FormData): Promise<TractionFormState> {
  await requireAdminScopeWrite("TRACTION");
  const trimmed = String(formData.get("name") || "").trim();
  if (!trimmed) return { error: "Vul een naam in." };

  await prisma.colleague.create({ data: { name: trimmed } });
  revalidatePath(COLLEAGUES_PATH);
  return { message: "Collega toegevoegd." };
}

/**
 * "Verwijderen" is een soft-delete (active=false). Heeft deze collega nog
 * taken toegewezen, dan is `reassignToId` verplicht -- eerst alle taken
 * herverdelen, dan pas deactiveren. Voorkomt dat taken "verdwijnen" als
 * iemand uit dienst gaat (expliciete eis uit de opdracht).
 */
export async function deactivateColleague(id: string, reassignToId?: string) {
  await requireAdminScopeWrite("TRACTION");

  const openRocks = await prisma.rock.findMany({ where: { ownerId: id }, select: { id: true } });

  if (openRocks.length > 0) {
    if (!reassignToId) {
      return {
        error: `Deze collega heeft nog ${openRocks.length} taak/taken. Kies eerst iemand anders om ze aan over te dragen.`,
        needsReassignment: true as const,
        openCount: openRocks.length,
      };
    }
    if (reassignToId === id) {
      return { error: "Kan taken niet aan dezelfde collega overdragen die wordt gedeactiveerd." };
    }
    await prisma.rock.updateMany({ where: { ownerId: id }, data: { ownerId: reassignToId } });
  }

  await prisma.colleague.update({ where: { id }, data: { active: false } });
  revalidatePath(COLLEAGUES_PATH);
  revalidatePath(PAGE_PATH);
  return { message: "Collega gedeactiveerd." };
}

export async function reactivateColleague(id: string) {
  await requireAdminScopeWrite("TRACTION");
  await prisma.colleague.update({ where: { id }, data: { active: true } });
  revalidatePath(COLLEAGUES_PATH);
}

// ---------------------------------------------------------------------------
// Statusopties (configureerbaar, geen vaste enum)
// ---------------------------------------------------------------------------

export async function createStatusOption(_state: TractionFormState, formData: FormData): Promise<TractionFormState> {
  await requireAdminScopeWrite("TRACTION");
  const trimmed = String(formData.get("label") || "").trim();
  if (!trimmed) return { error: "Vul een naam in." };

  const existing = await prisma.rockStatusOption.findUnique({ where: { label: trimmed } });
  if (existing) return { error: "Deze status bestaat al." };

  const max = await prisma.rockStatusOption.aggregate({ _max: { order: true } });
  await prisma.rockStatusOption.create({ data: { label: trimmed, order: (max._max.order ?? 0) + 1 } });
  revalidatePath(SETTINGS_PATH);
  return { message: "Status toegevoegd." };
}

/** Blokkeert verwijderen zolang er nog taken met deze status zijn -- anders
 * blijven die taken achter met een status die nergens meer voor staat. */
export async function deleteStatusOption(id: string) {
  await requireAdminScopeWrite("TRACTION");
  const option = await prisma.rockStatusOption.findUnique({ where: { id } });
  if (!option) return;

  const inUse = await prisma.rock.count({ where: { status: option.label } });
  if (inUse > 0) {
    return { error: `Nog in gebruik bij ${inUse} taak/taken -- wijzig eerst die taken naar een andere status.` };
  }

  await prisma.rockStatusOption.delete({ where: { id } });
  revalidatePath(SETTINGS_PATH);
  return { message: "Status verwijderd." };
}

export async function moveStatusOption(id: string, direction: "up" | "down") {
  await requireAdminScopeWrite("TRACTION");
  const options = await prisma.rockStatusOption.findMany({ orderBy: { order: "asc" } });
  const index = options.findIndex((o) => o.id === id);
  if (index === -1) return;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= options.length) return;

  const a = options[index];
  const b = options[swapWith];
  await prisma.$transaction([
    prisma.rockStatusOption.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.rockStatusOption.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath(SETTINGS_PATH);
}

// ---------------------------------------------------------------------------
// Taken ("rocks")
// ---------------------------------------------------------------------------

export type RockFormState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function createRock(_state: RockFormState, formData: FormData): Promise<RockFormState> {
  await requireAdminScopeWrite("TRACTION");

  const task = String(formData.get("task") || "").trim();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const status = String(formData.get("status") || "").trim();
  const ownerId = String(formData.get("ownerId") || "") || null;

  const errors: Record<string, string[]> = {};
  if (!task) errors.task = ["Vul een taakomschrijving in."];
  if (!year || year < 2000) errors.year = ["Vul een geldig jaar in."];
  if (!month || month < 1 || month > 12) errors.month = ["Vul een geldige maand in."];
  if (!status) errors.status = ["Kies een status."];
  if (Object.keys(errors).length > 0) return { errors };

  await prisma.rock.create({ data: { task, year, month, status, ownerId } });
  revalidatePath(PAGE_PATH);
  return { message: "Taak toegevoegd." };
}

export async function updateRockStatus(id: string, status: string) {
  await requireAdminScopeWrite("TRACTION");
  await prisma.rock.update({ where: { id }, data: { status } });
  revalidatePath(PAGE_PATH);
}

export async function updateRockTask(id: string, task: string) {
  await requireAdminScopeWrite("TRACTION");
  const trimmed = task.trim();
  if (!trimmed) return;
  await prisma.rock.update({ where: { id }, data: { task: trimmed } });
  revalidatePath(PAGE_PATH);
}

/** Wijst een taak toe aan een andere collega (of maakt 'm leeg) en legt dit
 * automatisch vast als voortgangsnotitie, zodat de overdracht terug te
 * vinden is in de geschiedenis van de taak. */
export async function handoffRock(id: string, newOwnerId: string | null) {
  const user = await requireAdminScopeWrite("TRACTION");

  const rock = await prisma.rock.findUnique({ where: { id }, include: { owner: true } });
  if (!rock) return;

  const newOwner = newOwnerId ? await prisma.colleague.findUnique({ where: { id: newOwnerId } }) : null;
  const fromLabel = rock.owner?.name ?? "niemand";
  const toLabel = newOwner?.name ?? "niemand";

  await prisma.$transaction([
    prisma.rock.update({ where: { id }, data: { ownerId: newOwnerId } }),
    prisma.rockUpdate.create({
      data: { rockId: id, authorId: user.id, note: `Overgedragen van ${fromLabel} naar ${toLabel}.` },
    }),
  ]);
  revalidatePath(PAGE_PATH);
}

export async function addRockUpdateNote(rockId: string, note: string) {
  const user = await requireAdminScopeWrite("TRACTION");
  const trimmed = note.trim();
  if (!trimmed) return;

  await prisma.rockUpdate.create({ data: { rockId, authorId: user.id, note: trimmed } });
  revalidatePath(PAGE_PATH);
}
