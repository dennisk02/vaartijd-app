"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isDateSubmitted } from "@/lib/day-submission";

const TimeEntrySchema = z.object({
  projectId: z.string().min(1, "Kies een project."),
  shipId: z.string().optional(),
  date: z.string().min(1, "Kies een datum."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Vul een geldige starttijd in."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Vul een geldige eindtijd in."),
  breakMinutes: z
    .string()
    .optional()
    .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), "Vul een geldige pauze in."),
  description: z.string().optional(),
});

export type TimeEntryFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function createTimeEntry(
  _state: TimeEntryFormState,
  formData: FormData
): Promise<TimeEntryFormState> {
  const user = await getUser();

  const validatedFields = TimeEntrySchema.safeParse({
    projectId: formData.get("projectId"),
    shipId: formData.get("shipId") || undefined,
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    breakMinutes: formData.get("breakMinutes") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { projectId, shipId, date, startTime, endTime, breakMinutes, description } = validatedFields.data;

  if (await isDateSubmitted(user.id, new Date(date))) {
    return { errors: { date: ["Deze dag is al ingediend en kan niet meer worden gewijzigd."] } };
  }

  const startDateTime = new Date(`${date}T${startTime}:00`);
  let endDateTime = new Date(`${date}T${endTime}:00`);
  if (endDateTime <= startDateTime) {
    endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
  }

  const breakMin = breakMinutes ? Number(breakMinutes) : 0;
  const totalMinutes = Math.max(0, Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000) - breakMin);
  const hours = Math.round((totalMinutes / 60) * 100) / 100;

  if (hours <= 0) {
    return { errors: { endTime: ["Eindtijd moet later zijn dan starttijd (na aftrek van pauze)."] } };
  }

  await prisma.timeEntry.create({
    data: {
      userId: user.id,
      projectId,
      shipId: shipId || null,
      date: new Date(date),
      startTime: startDateTime,
      endTime: endDateTime,
      breakMinutes: breakMin,
      mode: "MANUAL",
      hours,
      description: description || null,
      // Elke registratie start op PENDING richting zowel AFAS als Shiftbase
      // (§10.6) -- ongeacht of die koppeling al actief geconfigureerd is.
      afasLink: { create: {} },
      shiftbaseExport: { create: {} },
    },
  });

  revalidatePath("/uren");
  revalidatePath("/");
  return { message: "Uren geregistreerd." };
}

export async function deleteTimeEntry(id: string) {
  const user = await getUser();

  // Al naar AFAS geëxporteerde uren mogen niet meer verwijderd worden --
  // afasLink ontbreekt (nog nooit geprobeerd te syncen) of heeft een status
  // anders dan SYNCED. Zie lib/afas/hoursSync.ts (§10.6).
  await prisma.timeEntry.deleteMany({
    where: {
      id,
      userId: user.id,
      OR: [{ afasLink: null }, { afasLink: { syncStatus: { not: "SYNCED" } } }],
    },
  });

  revalidatePath("/uren");
  revalidatePath("/");
}
