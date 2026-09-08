"use server";

import * as z from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isDateSubmitted } from "@/lib/day-submission";

/// Iets ruimer dan de losse afvalvelden (max 5000 i.p.v. 1000) omdat dit de
/// hoeveelheid gebruikt voedsel is, niet verspilling -- die kan voor een
/// drukke dienst met veel gasten flink hoger liggen.
const foodUsedField = z
  .string()
  .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 5000, {
    message: "Vul een geldig aantal kg in.",
  });

const kgField = z
  .string()
  .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1000, {
    message: "Vul een geldig aantal kg in.",
  });

const FoodWasteSchema = z.object({
  shipId: z.string().min(1, "Kies een schip."),
  date: z.string().min(1, "Kies een datum."),
  foodUsedBreakfast: foodUsedField,
  passengerWasteBreakfast: kgField,
  kitchenWasteBreakfast: kgField,
  prepWasteBreakfast: kgField,
  foodUsedLunch: foodUsedField,
  passengerWasteLunch: kgField,
  kitchenWasteLunch: kgField,
  prepWasteLunch: kgField,
  foodUsedDinner: foodUsedField,
  passengerWasteDinner: kgField,
  kitchenWasteDinner: kgField,
  prepWasteDinner: kgField,
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

  const validatedFields = FoodWasteSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const data = validatedFields.data;
  const parsedDate = new Date(data.date);

  if (await isDateSubmitted(user.id, parsedDate)) {
    return { errors: { date: ["Deze dag is al ingediend en kan niet meer worden gewijzigd."] } };
  }

  const rows: {
    mealType: "BREAKFAST" | "LUNCH" | "DINNER";
    foodUsedKg: number;
    passengerWasteKg: number;
    kitchenWasteKg: number;
    prepWasteKg: number;
  }[] = [
    {
      mealType: "BREAKFAST",
      foodUsedKg: Number(data.foodUsedBreakfast),
      passengerWasteKg: Number(data.passengerWasteBreakfast),
      kitchenWasteKg: Number(data.kitchenWasteBreakfast),
      prepWasteKg: Number(data.prepWasteBreakfast),
    },
    {
      mealType: "LUNCH",
      foodUsedKg: Number(data.foodUsedLunch),
      passengerWasteKg: Number(data.passengerWasteLunch),
      kitchenWasteKg: Number(data.kitchenWasteLunch),
      prepWasteKg: Number(data.prepWasteLunch),
    },
    {
      mealType: "DINNER",
      foodUsedKg: Number(data.foodUsedDinner),
      passengerWasteKg: Number(data.passengerWasteDinner),
      kitchenWasteKg: Number(data.kitchenWasteDinner),
      prepWasteKg: Number(data.prepWasteDinner),
    },
  ];

  try {
    // Eén multi-row INSERT (Postgres voert createMany atomisch uit) i.p.v.
    // een losse existence-check vooraf -- scheelt een database-rondje en
    // sluit de race tussen check en insert uit.
    await prisma.foodWaste.createMany({
      data: rows.map((row) => ({
        shipId: data.shipId,
        date: parsedDate,
        mealType: row.mealType,
        foodUsedKg: row.foodUsedKg,
        passengerWasteKg: row.passengerWasteKg,
        kitchenWasteKg: row.kitchenWasteKg,
        prepWasteKg: row.prepWasteKg,
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
