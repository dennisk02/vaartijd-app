"use server";

import * as z from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isDateSubmitted } from "@/lib/day-submission";

const ShipOccupancySchema = z.object({
  shipId: z.string().min(1, "Kies een schip."),
  date: z.string().min(1, "Kies een datum."),
  dayPart: z.enum(["DAY", "NIGHT"]),
  passengerCount: z
    .string()
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 500, {
      message: "Vul een geldig aantal passagiers in.",
    }),
  crewCount: z
    .string()
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 500, {
      message: "Vul een geldig aantal bemanningsleden in.",
    }),
});

export type ShipOccupancyFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function createShipOccupancy(
  _state: ShipOccupancyFormState,
  formData: FormData
): Promise<ShipOccupancyFormState> {
  const user = await getUser();

  const validatedFields = ShipOccupancySchema.safeParse({
    shipId: formData.get("shipId"),
    date: formData.get("date"),
    dayPart: formData.get("dayPart"),
    passengerCount: formData.get("passengerCount"),
    crewCount: formData.get("crewCount"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { shipId, date, dayPart, passengerCount, crewCount } = validatedFields.data;
  const parsedDate = new Date(date);

  if (await isDateSubmitted(user.id, parsedDate)) {
    return { errors: { date: ["Deze dag is al ingediend en kan niet meer worden gewijzigd."] } };
  }

  try {
    await prisma.shipOccupancy.create({
      data: {
        shipId,
        date: parsedDate,
        dayPart,
        passengerCount: Number(passengerCount),
        crewCount: Number(crewCount),
        createdById: user.id,
      },
    });
  } catch (error) {
    // Uniek-constraint (shipId+date+dayPart) i.p.v. een losse existence-check
    // vooraf -- scheelt een database-rondje per invoer en sluit de race
    // tussen check en insert uit.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        errors: { shipId: ["Voor dit schip en dagdeel is vandaag al een bezetting ingevoerd. Dit kan niet worden gewijzigd."] },
      };
    }
    throw error;
  }

  revalidatePath("/scheepsbezetting");
  revalidatePath("/");
  return { message: "Bezetting opgeslagen." };
}
