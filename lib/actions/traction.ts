"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScopeWrite } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const OVERVIEW_PATH = "/traction";
const TAKEN_PATH = "/traction/taken";
const DOELEN_PATH = "/traction/doelen";
const COLLEAGUES_PATH = "/traction/collegas";
const SETTINGS_PATH = "/traction/instellingen";

function revalidateTractionPaths() {
  revalidatePath(OVERVIEW_PATH);
  revalidatePath(TAKEN_PATH);
  revalidatePath(DOELEN_PATH);
  revalidatePath(COLLEAGUES_PATH);
  revalidatePath(SETTINGS_PATH);
}

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
  revalidateTractionPaths();
  return { message: "Collega gedeactiveerd." };
}

export async function reactivateColleague(id: string) {
  await requireAdminScopeWrite("TRACTION");
  await prisma.colleague.update({ where: { id }, data: { active: true } });
  revalidatePath(COLLEAGUES_PATH);
}

// ---------------------------------------------------------------------------
// Statusopties voor taken (configureerbaar, geen vaste enum)
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
// Statusopties voor Doelen -- losse lijst, andere statussen dan bij taken.
// ---------------------------------------------------------------------------

export async function createGoalStatusOption(_state: TractionFormState, formData: FormData): Promise<TractionFormState> {
  await requireAdminScopeWrite("TRACTION");
  const trimmed = String(formData.get("label") || "").trim();
  if (!trimmed) return { error: "Vul een naam in." };

  const existing = await prisma.goalStatusOption.findUnique({ where: { label: trimmed } });
  if (existing) return { error: "Deze status bestaat al." };

  const max = await prisma.goalStatusOption.aggregate({ _max: { order: true } });
  await prisma.goalStatusOption.create({ data: { label: trimmed, order: (max._max.order ?? 0) + 1 } });
  revalidatePath(SETTINGS_PATH);
  return { message: "Status toegevoegd." };
}

export async function deleteGoalStatusOption(id: string) {
  await requireAdminScopeWrite("TRACTION");
  const option = await prisma.goalStatusOption.findUnique({ where: { id } });
  if (!option) return;

  const inUse = await prisma.goalItem.count({ where: { status: option.label } });
  if (inUse > 0) {
    return { error: `Nog in gebruik bij ${inUse} doel-item(s) -- wijzig eerst die items naar een andere status.` };
  }

  await prisma.goalStatusOption.delete({ where: { id } });
  revalidatePath(SETTINGS_PATH);
  return { message: "Status verwijderd." };
}

export async function moveGoalStatusOption(id: string, direction: "up" | "down") {
  await requireAdminScopeWrite("TRACTION");
  const options = await prisma.goalStatusOption.findMany({ orderBy: { order: "asc" } });
  const index = options.findIndex((o) => o.id === id);
  if (index === -1) return;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= options.length) return;

  const a = options[index];
  const b = options[swapWith];
  await prisma.$transaction([
    prisma.goalStatusOption.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.goalStatusOption.update({ where: { id: b.id }, data: { order: a.order } }),
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
  const status = String(formData.get("status") || "");
  const ownerId = String(formData.get("ownerId") || "") || null;

  const errors: Record<string, string[]> = {};
  if (!task) errors.task = ["Vul een taakomschrijving in."];
  if (!year || year < 2000) errors.year = ["Vul een geldig jaar in."];
  if (!month || month < 1 || month > 12) errors.month = ["Vul een geldige maand in."];
  if (Object.keys(errors).length > 0) return { errors };

  await prisma.rock.create({ data: { task, year, month, status, ownerId } });
  revalidatePath(TAKEN_PATH);
  revalidatePath(OVERVIEW_PATH);
  return { message: "Taak toegevoegd." };
}

export async function updateRockStatus(id: string, status: string) {
  await requireAdminScopeWrite("TRACTION");
  await prisma.rock.update({ where: { id }, data: { status } });
  revalidatePath(TAKEN_PATH);
  revalidatePath(OVERVIEW_PATH);
}

export async function updateRockTask(id: string, task: string) {
  await requireAdminScopeWrite("TRACTION");
  const trimmed = task.trim();
  if (!trimmed) return;
  await prisma.rock.update({ where: { id }, data: { task: trimmed } });
  revalidatePath(TAKEN_PATH);
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
  revalidatePath(TAKEN_PATH);
  revalidatePath(OVERVIEW_PATH);
}

export async function addRockUpdateNote(rockId: string, note: string) {
  const user = await requireAdminScopeWrite("TRACTION");
  const trimmed = note.trim();
  if (!trimmed) return;

  await prisma.rockUpdate.create({ data: { rockId, authorId: user.id, note: trimmed } });
  revalidatePath(TAKEN_PATH);
}

/** Doorzetten ("carry forward"): maakt een nieuwe, gekoppelde taak aan in de
 * volgende maand (met status teruggezet naar "geen status") en laat de
 * oorspronkelijke taak ongewijzigd staan -- de UI toont 'm dan doorgestreept
 * met een "doorgezet naar"-badge, en de nieuwe taak met een "doorgezet
 * vanuit"-badge (zie HANDOVER §10.9). */
export async function carryForwardRock(id: string) {
  await requireAdminScopeWrite("TRACTION");
  const rock = await prisma.rock.findUnique({ where: { id }, include: { carriedTo: { select: { id: true } } } });
  if (!rock || rock.carriedTo) return; // al doorgezet

  const nextMonth = rock.month === 12 ? 1 : rock.month + 1;
  const nextYear = rock.month === 12 ? rock.year + 1 : rock.year;
  await prisma.tractionYear.upsert({ where: { year: nextYear }, update: {}, create: { year: nextYear } });

  await prisma.rock.create({
    data: {
      year: nextYear,
      month: nextMonth,
      task: rock.task,
      ownerId: rock.ownerId,
      status: "",
      carriedFromId: rock.id,
    },
  });
  revalidatePath(TAKEN_PATH);
  revalidatePath(OVERVIEW_PATH);
}

// ---------------------------------------------------------------------------
// Jaren
// ---------------------------------------------------------------------------

/** Nieuw jaar toevoegen: kopieert de doelenstructuur (groepen + items) van
 * het meest recente jaar, met lege targets/statussen -- zelfde gedrag als
 * het origineel (`addNewYear()`). Rocks beginnen leeg. */
export async function addYear() {
  await requireAdminScopeWrite("TRACTION");

  const years = await prisma.tractionYear.findMany({ orderBy: { year: "desc" } });
  const latestYear = years[0]?.year ?? new Date().getFullYear();
  const newYear = latestYear + 1;

  const alreadyExists = years.some((y) => y.year === newYear);
  if (alreadyExists) return { error: `Jaar ${newYear} bestaat al.` };

  await prisma.tractionYear.create({ data: { year: newYear } });

  const sourceGroups = await prisma.goalCategoryGroup.findMany({
    where: { year: latestYear },
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
  for (const group of sourceGroups) {
    const newGroup = await prisma.goalCategoryGroup.create({
      data: { year: newYear, category: group.category, title: group.title, order: group.order },
    });
    for (const item of group.items) {
      await prisma.goalItem.create({
        data: { groupId: newGroup.id, label: item.label, target: "", status: "", order: item.order },
      });
    }
  }

  revalidateTractionPaths();
  return { message: `Jaar ${newYear} toegevoegd.`, year: newYear };
}

// ---------------------------------------------------------------------------
// Doelen
// ---------------------------------------------------------------------------

export async function updateGoalGroupTitle(id: string, title: string) {
  await requireAdminScopeWrite("TRACTION");
  const trimmed = title.trim();
  if (!trimmed) return;
  await prisma.goalCategoryGroup.update({ where: { id }, data: { title: trimmed } });
  revalidatePath(DOELEN_PATH);
}

export async function addGoalGroup(year: number, category: string) {
  await requireAdminScopeWrite("TRACTION");
  const max = await prisma.goalCategoryGroup.aggregate({ where: { year, category }, _max: { order: true } });
  await prisma.goalCategoryGroup.create({
    data: { year, category, title: "Nieuwe groep", order: (max._max.order ?? 0) + 1 },
  });
  revalidatePath(DOELEN_PATH);
}

export async function deleteGoalGroup(id: string) {
  await requireAdminScopeWrite("TRACTION");
  await prisma.goalCategoryGroup.delete({ where: { id } });
  revalidatePath(DOELEN_PATH);
}

export async function addGoalItem(groupId: string) {
  await requireAdminScopeWrite("TRACTION");
  const max = await prisma.goalItem.aggregate({ where: { groupId }, _max: { order: true } });
  await prisma.goalItem.create({
    data: { groupId, label: "Nieuw doel", target: "", status: "", order: (max._max.order ?? 0) + 1 },
  });
  revalidatePath(DOELEN_PATH);
}

export async function updateGoalItem(id: string, data: { label?: string; target?: string; status?: string }) {
  await requireAdminScopeWrite("TRACTION");
  await prisma.goalItem.update({ where: { id }, data });
  revalidatePath(DOELEN_PATH);
}

export async function deleteGoalItem(id: string) {
  await requireAdminScopeWrite("TRACTION");
  await prisma.goalItem.delete({ where: { id } });
  revalidatePath(DOELEN_PATH);
}

// ---------------------------------------------------------------------------
// Kernwaarden
// ---------------------------------------------------------------------------

export async function addCoreValue() {
  await requireAdminScopeWrite("TRACTION");
  const max = await prisma.coreValue.aggregate({ _max: { order: true } });
  await prisma.coreValue.create({ data: { label: "Nieuwe kernwaarde", meaning: [], measurement: [], order: (max._max.order ?? 0) + 1 } });
  revalidateTractionPaths();
}

export async function deleteCoreValue(id: string) {
  await requireAdminScopeWrite("TRACTION");
  await prisma.coreValue.delete({ where: { id } });
  revalidateTractionPaths();
}

/** `meaning`/`measurement` komen als één tekstveld binnen (één alinea/bullet
 * per regel) en worden hier gesplitst -- zelfde weergave als het origineel
 * (een lijst van alinea's resp. bullets). */
export async function updateCoreValue(id: string, data: { label?: string; meaningText?: string; measurementText?: string }) {
  await requireAdminScopeWrite("TRACTION");
  const update: { label?: string; meaning?: string[]; measurement?: string[] } = {};
  if (data.label !== undefined) update.label = data.label.trim();
  if (data.meaningText !== undefined) {
    update.meaning = data.meaningText.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  if (data.measurementText !== undefined) {
    update.measurement = data.measurementText.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  await prisma.coreValue.update({ where: { id }, data: update });
  revalidateTractionPaths();
}

// ---------------------------------------------------------------------------
// Organisatie-instellingen
// ---------------------------------------------------------------------------

export async function updateOrgSettings(_state: TractionFormState, formData: FormData): Promise<TractionFormState> {
  await requireAdminScopeWrite("TRACTION");
  const company = String(formData.get("company") || "").trim();
  const tagline = String(formData.get("tagline") || "").trim();

  await prisma.tractionOrg.upsert({
    where: { id: "singleton" },
    update: { company, tagline },
    create: { id: "singleton", company, tagline },
  });
  revalidateTractionPaths();
  return { message: "Instellingen opgeslagen." };
}
