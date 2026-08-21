import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { shiftbaseGet } from "@/lib/shiftbase/client";

/**
 * Importeert de River Roots-vaarbemanning uit Shiftbase (read-only) als
 * schepen, "vaarbemanning"-projecten, medewerkers en uren in Vaartijd.
 *
 * Elke Shiftbase-"department" komt overeen met precies één schip. Niet elke
 * department is daadwerkelijk een schip (bv. "Kantoor", "Quality") -- er is
 * geen betrouwbare naamregel om dat automatisch te herkennen, dus alle
 * departments worden wel gesynchroniseerd maar komen **inactief** binnen
 * (Ship.active = false); een beheerder activeert zelf de echte boten via het
 * bestaande schepen-beheerscherm. Hetzelfde geldt voor het bijbehorende
 * "Vaarbemanning <naam>"-project.
 *
 * Medewerkers krijgen een niet-inlogbaar Vaartijd-account (willekeurig
 * wachtwoord, active = false) puur om hun uren als TimeEntry te kunnen
 * vastleggen -- er wordt bewust geen gevoelige data (BSN, geboortedatum,
 * adres, loon) overgenomen, alleen naam + e-mailadres + het Shiftbase-ID.
 *
 * Performance: alles wordt eerst in bulk opgehaald en in Maps gezet, zodat
 * per Shiftbase-rij géén losse database-rondjes meer nodig zijn (een eerste
 * naieve opzet met een findUnique+upsert per rij liep bij ~270 medewerkers en
 * duizenden uren-regels vast op een onaanvaardbaar lange doorlooptijd).
 */

type ShiftbaseDepartment = { id: string | number; name: string };
type ShiftbaseUser = { id: string | number; first_name?: string; prefix?: string; last_name?: string; email?: string };
type ShiftbaseTimesheet = {
  id: string | number;
  user_id: string | number;
  date: string;
  starttime: string | null;
  endtime: string | null;
  total: string | number;
  break: string | number | null;
  status: string;
  deleted: boolean;
};

const VAARBEMANNING_PREFIX = "Vaarbemanning ";
const PLACEHOLDER_EMAIL_DOMAIN = "shiftbase.placeholder.vaartijd.internal";

function fullName(user: ShiftbaseUser) {
  return (
    [user.first_name, user.prefix, user.last_name]
      .map((part) => (part ?? "").trim())
      .filter(Boolean)
      .join(" ") || `Shiftbase-medewerker ${user.id}`
  );
}

/** Stap 1: elke Shiftbase-department -> een Ship + een bijbehorend Project. */
async function syncShipsAndProjects() {
  const response = (await shiftbaseGet("/departments")) as { data: { Department: ShiftbaseDepartment }[] };
  const departments = response.data.map((row) => ({ ...row.Department, id: String(row.Department.id) }));

  const [existingShips, existingProjects] = await Promise.all([
    prisma.ship.findMany({
      where: { shiftbaseDepartmentId: { not: null } },
      select: { shiftbaseDepartmentId: true, shiftbaseDepartmentName: true },
    }),
    prisma.project.findMany({ where: { shiftbaseDepartmentId: { not: null } }, select: { shiftbaseDepartmentId: true } }),
  ]);
  const shipByDept = new Map(existingShips.map((s) => [s.shiftbaseDepartmentId!, s]));
  const knownProjectDeptIds = new Set(existingProjects.map((p) => p.shiftbaseDepartmentId!));

  const shipsToCreate = departments.filter((d) => !shipByDept.has(d.id));
  const shipsToUpdate = departments.filter((d) => {
    const existing = shipByDept.get(d.id);
    return existing && existing.shiftbaseDepartmentName !== d.name;
  });
  const projectsToCreate = departments.filter((d) => !knownProjectDeptIds.has(d.id));

  if (shipsToCreate.length > 0) {
    await prisma.ship.createMany({
      data: shipsToCreate.map((d) => ({
        name: d.name,
        shiftbaseDepartmentId: d.id,
        shiftbaseDepartmentName: d.name,
        active: false,
      })),
    });
  }
  for (const d of shipsToUpdate) {
    await prisma.ship.update({
      where: { shiftbaseDepartmentId: d.id },
      data: { name: d.name, shiftbaseDepartmentName: d.name },
    });
  }
  if (projectsToCreate.length > 0) {
    await prisma.project.createMany({
      data: projectsToCreate.map((d) => ({
        name: `${VAARBEMANNING_PREFIX}${d.name}`,
        shiftbaseDepartmentId: d.id,
        active: false,
      })),
    });
  }

  return departments.length;
}

/** Stap 2: elke Shiftbase-gebruiker -> een (niet-inlogbaar) Vaartijd-account. */
async function syncCrewUsers() {
  const response = (await shiftbaseGet("/users?limit=500")) as { data: { User: ShiftbaseUser }[] };
  const shiftbaseUsers = response.data.map((row) => ({ ...row.User, id: String(row.User.id) }));

  const [existingByShiftbaseId, allEmails] = await Promise.all([
    prisma.user.findMany({
      where: { shiftbaseEmployeeId: { not: null } },
      select: { id: true, shiftbaseEmployeeId: true, name: true },
    }),
    prisma.user.findMany({ select: { email: true } }),
  ]);
  const userByShiftbaseId = new Map(existingByShiftbaseId.map((u) => [u.shiftbaseEmployeeId!, u]));
  const takenEmails = new Set(allEmails.map((u) => u.email.toLowerCase()));

  const toCreate = shiftbaseUsers.filter((u) => !userByShiftbaseId.has(u.id));
  const toUpdate = shiftbaseUsers.filter((u) => {
    const existing = userByShiftbaseId.get(u.id);
    return existing && existing.name !== fullName(u);
  });

  if (toCreate.length > 0) {
    // Eén gedeelde, willekeurige hash voor de hele batch i.p.v. per account
    // opnieuw bcrypt draaien (10 rounds x 270+ accounts was de dominante
    // kostenpost van deze sync, ~50-70s). Geen van deze accounts kan
    // sowieso inloggen (active = false), dus een uniek wachtwoord per
    // account levert geen extra veiligheid op.
    const sharedPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
    const rows = toCreate.map((u) => {
      const candidate = u.email?.trim().toLowerCase();
      const email =
        candidate && !takenEmails.has(candidate) ? u.email!.trim() : `shiftbase-${u.id}@${PLACEHOLDER_EMAIL_DOMAIN}`;
      takenEmails.add(email.toLowerCase());
      return {
        name: fullName(u),
        email,
        passwordHash: sharedPasswordHash,
        shiftbaseEmployeeId: u.id,
        active: false,
      };
    });
    await prisma.user.createMany({ data: rows });
  }
  for (const u of toUpdate) {
    await prisma.user.update({ where: { shiftbaseEmployeeId: u.id }, data: { name: fullName(u) } });
  }

  return shiftbaseUsers.length;
}

/** Stap 3: uren van de afgelopen `days` dagen ophalen en als TimeEntry vastleggen. */
async function syncTimesheets(days: number) {
  const maxDate = new Date();
  const minDate = new Date();
  minDate.setUTCDate(minDate.getUTCDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const response = (await shiftbaseGet(`/timesheets?min_date=${fmt(minDate)}&max_date=${fmt(maxDate)}`)) as {
    data: {
      Timesheet: ShiftbaseTimesheet;
      Department?: { id: string | number; name: string } | null;
      Team?: { name: string } | null;
    }[];
  };

  const [ships, projects, users, existingEntries] = await Promise.all([
    prisma.ship.findMany({ where: { shiftbaseDepartmentId: { not: null } }, select: { id: true, shiftbaseDepartmentId: true } }),
    prisma.project.findMany({ where: { shiftbaseDepartmentId: { not: null } }, select: { id: true, shiftbaseDepartmentId: true } }),
    prisma.user.findMany({ where: { shiftbaseEmployeeId: { not: null } }, select: { id: true, shiftbaseEmployeeId: true } }),
    prisma.timeEntry.findMany({
      where: { shiftbaseTimesheetId: { not: null } },
      select: { shiftbaseTimesheetId: true, hours: true, startTime: true, endTime: true },
    }),
  ]);
  const shipByDept = new Map(ships.map((s) => [s.shiftbaseDepartmentId!, s.id]));
  const projectByDept = new Map(projects.map((p) => [p.shiftbaseDepartmentId!, p.id]));
  const userByShiftbaseId = new Map(users.map((u) => [u.shiftbaseEmployeeId!, u.id]));
  const existingByTimesheetId = new Map(existingEntries.map((e) => [e.shiftbaseTimesheetId!, e]));

  let skippedNoShip = 0;
  let skippedNoUser = 0;
  let skippedNotApproved = 0;
  const toCreate: {
    shiftbaseTimesheetId: string;
    userId: string;
    projectId: string;
    shipId: string | null;
    date: Date;
    startTime: Date;
    endTime: Date;
    breakMinutes: number;
    mode: "SHIFTBASE_IMPORT";
    hours: number;
    description: string | null;
  }[] = [];
  const toUpdate: { shiftbaseTimesheetId: string; hours: number; startTime: Date; endTime: Date; breakMinutes: number }[] = [];

  for (const row of response.data) {
    const entry = row.Timesheet;
    if (entry.deleted) continue;
    if (entry.status !== "Approved") {
      skippedNotApproved++;
      continue;
    }
    if (!entry.starttime || !entry.endtime) continue;

    const departmentId = row.Department ? String(row.Department.id) : null;
    const projectId = departmentId ? projectByDept.get(departmentId) : undefined;
    if (!projectId) {
      skippedNoShip++;
      continue;
    }
    const userId = userByShiftbaseId.get(String(entry.user_id));
    if (!userId) {
      skippedNoUser++;
      continue;
    }

    const startDateTime = new Date(`${entry.date}T${entry.starttime}`);
    let endDateTime = new Date(`${entry.date}T${entry.endtime}`);
    if (endDateTime <= startDateTime) {
      endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
    }

    const timesheetId = String(entry.id);
    const hours = Math.round(Number(entry.total) * 100) / 100;
    const breakMinutes = entry.break ? Math.round(Number(entry.break)) : 0;

    const existing = existingByTimesheetId.get(timesheetId);
    if (existing) {
      const changed =
        Number(existing.hours) !== hours ||
        existing.startTime?.getTime() !== startDateTime.getTime() ||
        existing.endTime?.getTime() !== endDateTime.getTime();
      if (changed) toUpdate.push({ shiftbaseTimesheetId: timesheetId, hours, startTime: startDateTime, endTime: endDateTime, breakMinutes });
      continue;
    }

    toCreate.push({
      shiftbaseTimesheetId: timesheetId,
      userId,
      projectId,
      shipId: (departmentId && shipByDept.get(departmentId)) ?? null,
      date: new Date(entry.date),
      startTime: startDateTime,
      endTime: endDateTime,
      breakMinutes,
      mode: "SHIFTBASE_IMPORT",
      hours,
      description: row.Team?.name ?? null,
    });
  }

  if (toCreate.length > 0) {
    await prisma.timeEntry.createMany({ data: toCreate });
  }
  for (const u of toUpdate) {
    await prisma.timeEntry.update({
      where: { shiftbaseTimesheetId: u.shiftbaseTimesheetId },
      data: { hours: u.hours, startTime: u.startTime, endTime: u.endTime, breakMinutes: u.breakMinutes },
    });
  }

  return {
    total: response.data.length,
    processed: toCreate.length + toUpdate.length,
    skippedNoShip,
    skippedNoUser,
    skippedNotApproved,
  };
}

export async function syncShiftbaseCrew(days = 35) {
  const departmentCount = await syncShipsAndProjects();
  const userCount = await syncCrewUsers();
  const timesheetResult = await syncTimesheets(days);

  return {
    departments: departmentCount,
    users: userCount,
    timesheets: timesheetResult,
  };
}
