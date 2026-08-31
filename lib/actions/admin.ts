"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireAdminScope } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { AdminScope } from "@prisma/client";

const ADMIN_SCOPES: AdminScope[] = [
  "PROJECTS",
  "SHIPS",
  "USERS",
  "RENTMAN",
  "RENTMAN_FINANCIEEL",
  "SHIFTBASE",
  "AFAS",
  "RAPPORTAGES",
];

export type AdminFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

/// Projecten/schepen worden niet meer handmatig aangemaakt (27 aug 2026) --
/// die komen altijd via de Rentman- resp. Shiftbase-sync binnen (zie
/// lib/rentman/sync.ts / lib/shiftbase/sync.ts). createProject/createShip
/// zijn daarom verwijderd; toggleProjectActive/toggleShipActive en de
/// AFAS-projectcode blijven wel bewerkbaar (zie updateProjectAfasCode
/// hieronder).

export async function toggleProjectActive(id: string, active: boolean) {
  await requireAdminScope("PROJECTS");
  await prisma.project.update({ where: { id }, data: { active } });
  revalidatePath("/admin/projects");
}

/** AFAS-projectcode los bewerkbaar houden nu er geen aanmaakformulier meer
 * is (§10.6: afasProjectCode staat in ProjectAfasLink, niet op Project zelf). */
export async function updateProjectAfasCode(projectId: string, afasProjectCode: string) {
  await requireAdminScope("PROJECTS");
  const code = afasProjectCode.trim() || null;
  if (code) {
    await prisma.projectAfasLink.upsert({
      where: { projectId },
      update: { afasProjectCode: code },
      create: { projectId, afasProjectCode: code },
    });
  } else {
    await prisma.projectAfasLink.deleteMany({ where: { projectId } });
  }
  revalidatePath("/admin/projects");
  revalidatePath("/admin/rentman");
}

export async function toggleShipActive(id: string, active: boolean) {
  await requireAdminScope("SHIPS");
  await prisma.ship.update({ where: { id }, data: { active } });
  revalidatePath("/admin/ships");
}

const UserSchema = z.object({
  name: z.string().min(1, "Vul een naam in."),
  email: z.string().email("Vul een geldig e-mailadres in."),
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens zijn."),
  role: z.enum(["EMPLOYEE", "ADMIN"]),
  afasEmployeeNumber: z.string().optional(),
});

export async function createUser(_state: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();

  const validatedFields = UserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    afasEmployeeNumber: formData.get("afasEmployeeNumber") || undefined,
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password, role, afasEmployeeNumber } = validatedFields.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ["Dit e-mailadres is al in gebruik."] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // afasEmployeeNumber staat sinds §10.6 in een eigen koppeltabel.
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      ...(afasEmployeeNumber ? { afasLink: { create: { afasEmployeeNumber } } } : {}),
    },
  });

  revalidatePath("/admin/users");
  return { message: "Medewerker aangemaakt." };
}

export async function toggleUserActive(id: string, active: boolean) {
  await requireAdminScope("USERS");
  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/admin/users");
}

export async function updateUserAssignments(userId: string, formData: FormData) {
  const currentUser = await requireAdminScope("USERS");

  const projectIds = formData.getAll("projectIds").map(String);
  const shipIds = formData.getAll("shipIds").map(String);
  const canLogOccupancy = formData.get("canLogOccupancy") === "on";
  const canLogMeals = formData.get("canLogMeals") === "on";
  const canLogWaste = formData.get("canLogWaste") === "on";
  const useDefaultProject = formData.get("useDefaultProject") === "on";
  const defaultProjectId = String(formData.get("defaultProjectId") || "") || null;
  const shiftbaseEmployeeId = String(formData.get("shiftbaseEmployeeId") || "").trim() || null;
  const projectGroupRaw = String(formData.get("projectGroup") || "EVENTS_EVENTO");
  const projectGroup = ["EVENTS_EVENTO", "RIVER_ROOTS"].includes(projectGroupRaw)
    ? (projectGroupRaw as "EVENTS_EVENTO" | "RIVER_ROOTS")
    : "EVENTS_EVENTO";

  // Scoped Medewerkers-beheerders (role !== "ADMIN") mogen bestaande
  // toewijzingen/instellingen bewerken, maar niet iemands admin-scopes
  // wijzigen -- dat blijft aan volledige beheerders voorbehouden (voorkomt
  // zelf-escalatie). Het formulier verbergt dit veld al voor scoped
  // beheerders (zie app/admin/users/[id]/page.tsx), maar de server-actie
  // valideert het onafhankelijk nogmaals i.p.v. alleen op UI te vertrouwen.
  const adminScopes =
    currentUser.role === "ADMIN"
      ? formData.getAll("adminScopes").map(String).filter((s): s is AdminScope => ADMIN_SCOPES.includes(s as AdminScope))
      : undefined;

  await prisma.user.update({
    where: { id: userId },
    data: {
      assignedProjects: { set: projectIds.map((id) => ({ id })) },
      assignedShips: { set: shipIds.map((id) => ({ id })) },
      canLogOccupancy,
      canLogMeals,
      canLogWaste,
      useDefaultProject: useDefaultProject && Boolean(defaultProjectId),
      defaultProjectId,
      projectGroup,
      ...(adminScopes !== undefined ? { adminScopes: { set: adminScopes } } : {}),
    },
  });

  // shiftbaseEmployeeId staat sinds §10.6 in een eigen koppeltabel -- los
  // bijgewerkt (leegmaken = koppeling verwijderen, i.p.v. een kolom op null
  // zetten).
  if (shiftbaseEmployeeId) {
    await prisma.userShiftbaseLink.upsert({
      where: { userId },
      update: { shiftbaseEmployeeId },
      create: { userId, shiftbaseEmployeeId },
    });
  } else {
    await prisma.userShiftbaseLink.deleteMany({ where: { userId } });
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

/** Handmatige 2FA-reset (bv. telefoon kwijt) -- alleen volledige beheerders,
 * geen scoped Medewerkers-beheerders, want het is in feite een
 * beveiligingsreset. Bij de volgende login moet de medewerker 2FA opnieuw
 * instellen (zie proxy.ts). */
export async function resetUserTotp(userId: string) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: false, totpSecret: null, totpSecretPending: null },
  });
  revalidatePath(`/admin/users/${userId}`);
}
