"use server";

import * as z from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isDateSubmitted } from "@/lib/day-submission";

const countField = z
  .string()
  .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 5000, {
    message: "Vul een geldig aantal in.",
  });

const MealCountsSchema = z.object({
  shipId: z.string().min(1, "Kies een schip."),
  date: z.string().min(1, "Kies een datum."),
  countBreakfast: countField,
  countLunch: countField,
  countDinner: countField,
});

export type MealCountsFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function createMealCounts(
  _state: MealCountsFormState,
  formData: FormData
): Promise<MealCountsFormState> {
  const user = await getUser();

  const validatedFields = MealCountsSchema.safeParse({
    shipId: formData.get("shipId"),
    date: formData.get("date"),
    countBreakfast: formData.get("countBreakfast"),
    countLunch: formData.get("countLunch"),
    countDinner: formData.get("countDinner"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { shipId, date, countBreakfast, countLunch, countDinner } = validatedFields.data;
  const parsedDate = new Date(date);

  if (await isDateSubmitted(user.id, parsedDate)) {
    return { errors: { date: ["Deze dag is al ingediend en kan niet meer worden gewijzigd."] } };
  }

  const rows: { mealType: "BREAKFAST" | "LUNCH" | "DINNER"; count: number }[] = [
    { mealType: "BREAKFAST", count: Number(countBreakfast) },
    { mealType: "LUNCH", count: Number(countLunch) },
    { mealType: "DINNER", count: Number(countDinner) },
  ];

  try {
    // Eén multi-row INSERT (Postgres voert createMany atomisch uit) i.p.v.
    // een losse existence-check vooraf -- scheelt een database-rondje en
    // sluit de race tussen check en insert uit.
    await prisma.mealCount.createMany({
      data: rows.map((row) => ({
        shipId,
        date: parsedDate,
        mealType: row.mealType,
        countServed: row.count,
        createdById: user.id,
      })),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        errors: { shipId: ["Voor dit schip is vandaag al een maaltijdenregistratie ingevoerd. Dit kan niet worden gewijzigd."] },
      };
    }
    throw error;
  }

  revalidatePath("/maaltijden");
  revalidatePath("/");
  return { message: "Maaltijden opgeslagen." };
}
