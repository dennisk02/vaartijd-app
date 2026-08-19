/**
 * Vult de database met een jaar aan voorbeeld-/demogegevens: schepen,
 * projecten, medewerkers, uren, scheepsbezetting en maaltijden. Los van
 * `seed.ts` (dat alleen het admin-account bootstrapt) omdat dit script
 * bewust grote hoeveelheden verzonnen data genereert -- draai het dus
 * alleen tegen een omgeving waar dat gewenst is.
 *
 * Runnen: npm run seed:demo
 */
import { PrismaClient, DayPart, MealType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAYS = 365;
const DEMO_PASSWORD = "demodemo123";

const SHIPS: { name: string; code: string; capacity: number }[] = [
  { name: "Triton", code: "TRI", capacity: 8 },
  { name: "Rotterdam", code: "ROT", capacity: 14 },
  { name: "Amanapori", code: "AMA", capacity: 10 },
  { name: "Fortuna", code: "FOR", capacity: 6 },
  { name: "Elice", code: "ELI", capacity: 9 },
  { name: "Azola", code: "AZO", capacity: 7 },
  { name: "Alegro", code: "ALE", capacity: 12 },
  { name: "Alissia", code: "ALI", capacity: 8 },
  { name: "Rossini", code: "ROS", capacity: 11 },
  { name: "Pateria", code: "PAT", capacity: 5 },
  { name: "Danobia", code: "DAN", capacity: 13 },
];

const PROJECTS: { name: string; afasProjectCode: string }[] = [
  { name: "Onderhoud vlootbreed", afasProjectCode: "PRJ-100" },
  { name: "Reguliere vaardiensten", afasProjectCode: "PRJ-101" },
  { name: "Renovatie stuurhut", afasProjectCode: "PRJ-102" },
  { name: "Havenwerkzaamheden", afasProjectCode: "PRJ-103" },
  { name: "Noodreparaties", afasProjectCode: "PRJ-104" },
  { name: "Opleiding & inductie", afasProjectCode: "PRJ-105" },
];

const EMPLOYEES: { name: string; email: string; afasEmployeeNumber: string }[] = [
  { name: "Bram Visser", email: "bram.visser@demo.vaartijd.nl", afasEmployeeNumber: "1001" },
  { name: "Lotte Bakker", email: "lotte.bakker@demo.vaartijd.nl", afasEmployeeNumber: "1002" },
  { name: "Sanne Mulder", email: "sanne.mulder@demo.vaartijd.nl", afasEmployeeNumber: "1003" },
  { name: "Daan Smit", email: "daan.smit@demo.vaartijd.nl", afasEmployeeNumber: "1004" },
  { name: "Fleur de Jong", email: "fleur.dejong@demo.vaartijd.nl", afasEmployeeNumber: "1005" },
  { name: "Milan Peters", email: "milan.peters@demo.vaartijd.nl", afasEmployeeNumber: "1006" },
  { name: "Noor Hendriks", email: "noor.hendriks@demo.vaartijd.nl", afasEmployeeNumber: "1007" },
  { name: "Sem Dekker", email: "sem.dekker@demo.vaartijd.nl", afasEmployeeNumber: "1008" },
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(items: T[]): T {
  return items[randInt(0, items.length - 1)];
}

function dateStringDaysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function chunkedCreateMany<T>(label: string, rows: T[], create: (batch: T[]) => Promise<unknown>) {
  const batchSize = 1000;
  for (let i = 0; i < rows.length; i += batchSize) {
    await create(rows.slice(i, i + batchSize));
  }
  console.log(`${label}: ${rows.length} rijen`);
}

async function main() {
  // --- Schepen ---
  const existingShips = await prisma.ship.findMany({ where: { name: { in: SHIPS.map((s) => s.name) } } });
  const existingShipNames = new Set(existingShips.map((s) => s.name));
  const shipsToCreate = SHIPS.filter((s) => !existingShipNames.has(s.name));
  if (shipsToCreate.length > 0) {
    await prisma.ship.createMany({
      data: shipsToCreate.map((s) => ({ name: s.name, code: s.code, capacity: s.capacity })),
    });
  }
  // Backvullen van capaciteit voor schepen die al bestonden vóór dit veld werd toegevoegd.
  await Promise.all(
    existingShips
      .filter((s) => s.capacity == null)
      .map((s) => {
        const capacity = SHIPS.find((demo) => demo.name === s.name)?.capacity;
        return capacity ? prisma.ship.update({ where: { id: s.id }, data: { capacity } }) : Promise.resolve();
      })
  );
  const ships = await prisma.ship.findMany({ where: { name: { in: SHIPS.map((s) => s.name) } } });
  const shipByName = new Map(ships.map((s) => [s.name, s]));
  const capacityByShipId = new Map(SHIPS.map((s) => [shipByName.get(s.name)!.id, s.capacity]));

  // --- Projecten ---
  const existingProjects = await prisma.project.findMany({ where: { name: { in: PROJECTS.map((p) => p.name) } } });
  const existingProjectNames = new Set(existingProjects.map((p) => p.name));
  const projectsToCreate = PROJECTS.filter((p) => !existingProjectNames.has(p.name));
  if (projectsToCreate.length > 0) {
    await prisma.project.createMany({ data: projectsToCreate });
  }
  const projects = await prisma.project.findMany({ where: { name: { in: PROJECTS.map((p) => p.name) } } });

  // --- Medewerkers ---
  const existingEmployees = await prisma.user.findMany({ where: { email: { in: EMPLOYEES.map((e) => e.email) } } });
  const existingEmployeeEmails = new Set(existingEmployees.map((e) => e.email));
  const employeesToCreate = EMPLOYEES.filter((e) => !existingEmployeeEmails.has(e.email));
  if (employeesToCreate.length > 0) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await prisma.user.createMany({
      data: employeesToCreate.map((e) => ({
        name: e.name,
        email: e.email,
        passwordHash,
        role: "EMPLOYEE",
        afasEmployeeNumber: e.afasEmployeeNumber,
      })),
    });
  }
  const employees = await prisma.user.findMany({ where: { email: { in: EMPLOYEES.map((e) => e.email) } } });

  // Elke medewerker koppelen aan 1-2 schepen en 1-2 projecten (voor de toewijzingsfunctie).
  for (const employee of employees) {
    const assignedShips = [pick(ships), pick(ships)];
    const assignedProjects = [pick(projects), pick(projects)];
    await prisma.user.update({
      where: { id: employee.id },
      data: {
        assignedShips: { set: [...new Set(assignedShips.map((s) => s.id))].map((id) => ({ id })) },
        assignedProjects: { set: [...new Set(assignedProjects.map((p) => p.id))].map((id) => ({ id })) },
      },
    });
  }
  console.log(`Medewerkers: ${employees.length} (wachtwoord voor nieuwe demo-accounts: ${DEMO_PASSWORD})`);

  // --- Opschonen van eerder gegenereerde demodata (idempotent herdraaien) ---
  await prisma.timeEntry.deleteMany({ where: { userId: { in: employees.map((e) => e.id) } } });

  // --- Uren, scheepsbezetting, maaltijden en afval voor de afgelopen 365 dagen ---
  const timeEntryRows: {
    userId: string;
    projectId: string;
    shipId: string | null;
    date: Date;
    startTime: Date;
    endTime: Date;
    breakMinutes: number;
    mode: "MANUAL";
    hours: number;
    description: string | null;
  }[] = [];
  const occupancyRows: {
    shipId: string;
    date: Date;
    dayPart: DayPart;
    passengerCount: number;
    crewCount: number;
    createdById: string;
  }[] = [];
  const mealCountRows: {
    shipId: string;
    date: Date;
    mealType: MealType;
    countServed: number;
    createdById: string;
  }[] = [];
  const foodWasteRows: {
    shipId: string;
    date: Date;
    mealType: MealType;
    kg: number;
    createdById: string;
  }[] = [];

  const firstEmployeeId = employees[0]?.id;

  for (let i = DAYS - 1; i >= 0; i--) {
    const dateStr = dateStringDaysAgo(i);
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay(); // 0 = zondag
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const ship of ships) {
      const capacity = capacityByShipId.get(ship.id) ?? 8;
      const dayPax = Math.round(capacity * randFloat(0.5, 0.85));
      const dayCrew = Math.round(capacity * randFloat(0.1, 0.25));
      const nightPax = Math.round(capacity * randFloat(0.3, 0.7));
      const nightCrew = Math.round(capacity * randFloat(0.08, 0.2));

      occupancyRows.push({
        shipId: ship.id,
        date,
        dayPart: "DAY",
        passengerCount: dayPax,
        crewCount: dayCrew,
        createdById: firstEmployeeId,
      });
      occupancyRows.push({
        shipId: ship.id,
        date,
        dayPart: "NIGHT",
        passengerCount: nightPax,
        crewCount: nightCrew,
        createdById: firstEmployeeId,
      });

      const dayOnboard = dayPax + dayCrew;
      const nightOnboard = nightPax + nightCrew;
      for (const mealType of ["BREAKFAST", "LUNCH", "DINNER"] as MealType[]) {
        const eaters =
          mealType === "BREAKFAST" ? dayOnboard : Math.round((dayOnboard + nightOnboard) / 2);
        const countServed = Math.max(0, Math.round(eaters * randFloat(0.85, 1.05)));
        const wasteKg = Math.round(countServed * randFloat(0.05, 0.2) * 10) / 10;

        mealCountRows.push({ shipId: ship.id, date, mealType, countServed, createdById: firstEmployeeId });
        foodWasteRows.push({ shipId: ship.id, date, mealType, kg: wasteKg, createdById: firstEmployeeId });
      }
    }

    // Uren: niet elke medewerker werkt elke dag, weekend minder waarschijnlijk.
    for (const employee of employees) {
      const worksToday = Math.random() < (isWeekend ? 0.15 : 0.75);
      if (!worksToday) continue;

      const project = pick(projects);
      const linkToShip = Math.random() < 0.6;
      const hours = Math.round(randFloat(4, 9) * 4) / 4; // afgerond op kwartieren
      const startHour = randInt(6, 9);
      const startTime = new Date(date);
      startTime.setUTCHours(startHour, pick([0, 15, 30, 45]), 0, 0);
      const breakMinutes = pick([0, 30, 45]);
      const endTime = new Date(startTime.getTime() + (hours * 60 + breakMinutes) * 60 * 1000);

      timeEntryRows.push({
        userId: employee.id,
        projectId: project.id,
        shipId: linkToShip ? pick(ships).id : null,
        date,
        startTime,
        endTime,
        breakMinutes,
        mode: "MANUAL",
        hours,
        description: null,
      });
    }
  }

  await chunkedCreateMany("Scheepsbezetting", occupancyRows, (batch) =>
    prisma.shipOccupancy.createMany({ data: batch, skipDuplicates: true })
  );
  await chunkedCreateMany("Maaltijden geserveerd", mealCountRows, (batch) =>
    prisma.mealCount.createMany({ data: batch, skipDuplicates: true })
  );
  await chunkedCreateMany("Voedselverspilling", foodWasteRows, (batch) =>
    prisma.foodWaste.createMany({ data: batch, skipDuplicates: true })
  );
  await chunkedCreateMany("Urenregistraties", timeEntryRows, (batch) =>
    prisma.timeEntry.createMany({ data: batch })
  );

  console.log("Klaar.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
