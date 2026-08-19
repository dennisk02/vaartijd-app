"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const ProjectSchema = z.object({
  name: z.string().min(1, "Vul een naam in."),
  afasProjectCode: z.string().optional(),
});

export type AdminFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function createProject(_state: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();

  const validatedFields = ProjectSchema.safeParse({
    name: formData.get("name"),
    afasProjectCode: formData.get("afasProjectCode") || undefined,
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await prisma.project.create({
    data: {
      name: validatedFields.data.name,
      afasProjectCode: validatedFields.data.afasProjectCode || null,
    },
  });

  revalidatePath("/admin/projects");
  return { message: "Project aangemaakt." };
}

export async function toggleProjectActive(id: string, active: boolean) {
  await requireAdmin();
  await prisma.project.update({ where: { id }, data: { active } });
  revalidatePath("/admin/projects");
}

const ShipSchema = z.object({
  name: z.string().min(1, "Vul een naam in."),
  code: z.string().optional(),
  capacity: z
    .string()
    .optional()
    .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0), "Vul een geldige capaciteit in."),
});

export async function createShip(_state: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();

  const validatedFields = ShipSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
    capacity: formData.get("capacity") || undefined,
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await prisma.ship.create({
    data: {
      name: validatedFields.data.name,
      code: validatedFields.data.code || null,
      capacity: validatedFields.data.capacity ? Number(validatedFields.data.capacity) : null,
    },
  });

  revalidatePath("/admin/ships");
  return { message: "Schip aangemaakt." };
}

export async function toggleShipActive(id: string, active: boolean) {
  await requireAdmin();
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
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      afasEmployeeNumber: afasEmployeeNumber || null,
    },
  });

  revalidatePath("/admin/users");
  return { message: "Medewerker aangemaakt." };
}

export async function toggleUserActive(id: string, active: boolean) {
  await requireAdmin();
  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/admin/users");
}

export async function updateUserAssignments(userId: string, formData: FormData) {
  await requireAdmin();

  const projectIds = formData.getAll("projectIds").map(String);
  const shipIds = formData.getAll("shipIds").map(String);
  const canLogOccupancy = formData.get("canLogOccupancy") === "on";
  const canLogMeals = formData.get("canLogMeals") === "on";
  const canLogWaste = formData.get("canLogWaste") === "on";
  const useDefaultProject = formData.get("useDefaultProject") === "on";
  const defaultProjectId = String(formData.get("defaultProjectId") || "") || null;
  const shiftbaseEmployeeId = String(formData.get("shiftbaseEmployeeId") || "").trim() || null;
  const projectGroupRaw = String(formData.get("projectGroup") || "ALL");
  const projectGroup = ["ALL", "EVENTS", "EVENTO"].includes(projectGroupRaw)
    ? (projectGroupRaw as "ALL" | "EVENTS" | "EVENTO")
    : "ALL";

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
      shiftbaseEmployeeId,
      projectGroup,
    },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}
