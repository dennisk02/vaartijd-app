"use server";

import * as z from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isDateSubmitted } from "@/lib/day-submission";

const kgField = z
  .string()
  .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1000, {
    message: "Vul een geldig aantal kg in.",
  });

const FoodWasteSchema = z.object({
  shipId: z.string().min(1, "Kies een schip."),
  date: z.string().min(1, "Kies een datum."),
  kgBreakfast: kgField,
  kgLunch: kgField,
  kgDinner: kgField,
});

export type FoodWasteFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function createFoodWaste(
  _state: FoodWasteFormState,
  formData: FormData
): Promise<FoodWasteFormState> {
  const user = await getUser();

  const validatedFields = FoodWasteSchema.safeParse({
    shipId: formData.get("shipId"),
    date: formData.get("date"),
    kgBreakfast: formData.get("kgBreakfast"),
    kgLunch: formData.get("kgLunch"),
    kgDinner: formData.get("kgDinner"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { shipId, date, kgBreakfast, kgLunch, kgDinner } = validatedFields.data;
  const parsedDate = new Date(date);

  if (await isDateSubmitted(user.id, parsedDate)) {
    return { errors: { date: ["Deze dag is al ingediend en kan niet meer worden gewijzigd."] } };
  }

  const rows: { mealType: "BREAKFAST" | "LUNCH" | "DINNER"; kg: number }[] = [
    { mealType: "BREAKFAST", kg: Number(kgBreakfast) },
    { mealType: "LUNCH", kg: Number(kgLunch) },
    { mealType: "DINNER", kg: Number(kgDinner) },
  ];

  try {
    // Eén multi-row INSERT (Postgres voert createMany atomisch uit) i.p.v.
    // een losse existence-check vooraf -- scheelt een database-rondje en
    // sluit de race tussen check en insert uit.
    await prisma.foodWaste.createMany({
      data: rows.map((row) => ({
        shipId,
        date: parsedDate,
        mealType: row.mealType,
        kg: row.kg,
        createdById: user.id,
      })),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        errors: { shipId: ["Voor dit schip is vandaag al voedselverspilling ingevoerd. Dit kan niet worden gewijzigd."] },
      };
    }
    throw error;
  }

  revalidatePath("/afval");
  revalidatePath("/");
  return { message: "Voedselverspilling opgeslagen." };
}
